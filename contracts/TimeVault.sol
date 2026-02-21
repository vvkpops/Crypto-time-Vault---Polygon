// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title TimeVault
 * @notice A self-custody time-locked savings vault.
 *         Deposit native ETH/MATIC or any ERC-20 token, choose a lock duration,
 *         and funds are INACCESSIBLE until the lock expires — not even you can
 *         touch them before the timer runs out.
 */
contract TimeVault is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ─── Data Structures ────────────────────────────────────────────────────────

    struct Lock {
        uint256 id;          // unique lock id per user
        address token;       // address(0) = native coin; else ERC-20 contract address
        uint256 amount;      // amount locked (in smallest unit)
        uint256 unlocksAt;   // unix timestamp when funds become withdrawable
        uint256 createdAt;   // when the lock was created
        string  label;       // optional note e.g. "Holiday fund 2026"
        bool    withdrawn;   // true after the user has claimed the funds
    }

    // owner → array of locks
    mapping(address => Lock[]) private _locks;

    // global counter for unique lock IDs
    uint256 private _nextLockId;

    // ─── Events ──────────────────────────────────────────────────────────────────

    event Deposited(
        address indexed owner,
        uint256 indexed lockId,
        address indexed token,
        uint256 amount,
        uint256 unlocksAt,
        string  label
    );

    event Withdrawn(
        address indexed owner,
        uint256 indexed lockId,
        address indexed token,
        uint256 amount
    );

    // ─── Errors ───────────────────────────────────────────────────────────────────

    error ZeroAmount();
    error LockDurationTooShort();     // minimum 1 minute
    error LockNotFound();
    error LockAlreadyWithdrawn();
    error LockNotYetExpired(uint256 unlocksAt, uint256 currentTime);
    error NativeTransferFailed();
    error MismatchedNativeAmount();

    // ─── Constants ───────────────────────────────────────────────────────────────

    uint256 public constant MIN_LOCK_DURATION = 1 minutes;
    uint256 public constant MAX_LOCK_DURATION = 50 * 365 days; // 50 years max

    // ─── Deposit ─────────────────────────────────────────────────────────────────

    /**
     * @notice Lock native coin (ETH on Base, MATIC on Polygon, etc.)
     * @param lockDuration  How many seconds to lock for (e.g. 30 days = 2592000)
     * @param label         Optional personal note
     */
    function depositNative(
        uint256 lockDuration,
        string calldata label
    ) external payable nonReentrant {
        if (msg.value == 0) revert ZeroAmount();
        if (lockDuration < MIN_LOCK_DURATION || lockDuration > MAX_LOCK_DURATION)
            revert LockDurationTooShort();

        _createLock(msg.sender, address(0), msg.value, lockDuration, label);
    }

    /**
     * @notice Lock an ERC-20 token (USDC, USDT, WBTC, etc.)
     *         You must approve this contract first:
     *           token.approve(vaultAddress, amount)
     * @param token         ERC-20 token contract address
     * @param amount        Amount to lock (in the token's smallest unit)
     * @param lockDuration  How many seconds to lock for
     * @param label         Optional personal note
     */
    function depositERC20(
        address token,
        uint256 amount,
        uint256 lockDuration,
        string calldata label
    ) external nonReentrant {
        if (amount == 0) revert ZeroAmount();
        if (token == address(0)) revert LockNotFound(); // use depositNative for native
        if (lockDuration < MIN_LOCK_DURATION || lockDuration > MAX_LOCK_DURATION)
            revert LockDurationTooShort();

        // Pull tokens from caller — SafeERC20 handles fee-on-transfer tokens
        uint256 before = IERC20(token).balanceOf(address(this));
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        uint256 actualAmount = IERC20(token).balanceOf(address(this)) - before;

        _createLock(msg.sender, token, actualAmount, lockDuration, label);
    }

    // ─── Withdraw ────────────────────────────────────────────────────────────────

    /**
     * @notice Withdraw a specific lock after its timer has expired.
     * @param lockIndex  The index in the caller's lock array (0-based).
     *                   Use getLocks() to find the right index.
     */
    function withdraw(uint256 lockIndex) external nonReentrant {
        Lock[] storage userLocks = _locks[msg.sender];
        if (lockIndex >= userLocks.length) revert LockNotFound();

        Lock storage lock = userLocks[lockIndex];
        if (lock.withdrawn) revert LockAlreadyWithdrawn();
        if (block.timestamp < lock.unlocksAt)
            revert LockNotYetExpired(lock.unlocksAt, block.timestamp);

        lock.withdrawn = true;
        uint256 amount = lock.amount;
        address token  = lock.token;
        uint256 lockId = lock.id;

        if (token == address(0)) {
            // Native coin transfer
            (bool ok, ) = msg.sender.call{value: amount}("");
            if (!ok) revert NativeTransferFailed();
        } else {
            IERC20(token).safeTransfer(msg.sender, amount);
        }

        emit Withdrawn(msg.sender, lockId, token, amount);
    }

    // ─── View Functions ──────────────────────────────────────────────────────────

    /**
     * @notice Get all locks for a given address.
     */
    function getLocks(address owner) external view returns (Lock[] memory) {
        return _locks[owner];
    }

    /**
     * @notice How many seconds remain before a specific lock can be withdrawn.
     *         Returns 0 if the lock has already expired.
     */
    function timeRemaining(address owner, uint256 lockIndex)
        external
        view
        returns (uint256)
    {
        Lock[] storage userLocks = _locks[owner];
        if (lockIndex >= userLocks.length) revert LockNotFound();
        Lock storage lock = userLocks[lockIndex];
        if (block.timestamp >= lock.unlocksAt) return 0;
        return lock.unlocksAt - block.timestamp;
    }

    /**
     * @notice Number of locks (active + withdrawn) for an address.
     */
    function lockCount(address owner) external view returns (uint256) {
        return _locks[owner].length;
    }

    // ─── Internal ────────────────────────────────────────────────────────────────

    function _createLock(
        address owner,
        address token,
        uint256 amount,
        uint256 lockDuration,
        string calldata label
    ) internal {
        uint256 id = _nextLockId++;
        uint256 unlocksAt = block.timestamp + lockDuration;

        _locks[owner].push(Lock({
            id:         id,
            token:      token,
            amount:     amount,
            unlocksAt:  unlocksAt,
            createdAt:  block.timestamp,
            label:      label,
            withdrawn:  false
        }));

        emit Deposited(owner, id, token, amount, unlocksAt, label);
    }
}
