import React from "react";
import { shortAddr } from "../utils/format";

export default function Header({ account, chainMeta, onConnect, loading }) {
  return (
    <header className="header">
      <div className="header-brand">
        <div className="header-logo">🔒</div>
        <div>
          <div className="header-title">TimeVault</div>
          <div className="header-subtitle">Self-custody time-locked savings</div>
        </div>
      </div>

      <div className="header-right">
        {account && chainMeta?.name && (
          <div className="network-badge">
            <span className="network-dot" />
            {chainMeta.name}
          </div>
        )}
        <button
          className={`btn-wallet ${account ? "connected" : "disconnected"}`}
          onClick={onConnect}
          disabled={loading}
        >
          {loading ? "Connecting…" : account ? shortAddr(account) : "Connect Wallet"}
        </button>
      </div>
    </header>
  );
}
