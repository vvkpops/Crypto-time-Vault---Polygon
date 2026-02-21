import React from "react";
import { motion } from "framer-motion";
import { shortAddr } from "../utils/format";

const headerVariants = {
  hidden: { opacity: 0, y: -30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1], staggerChildren: 0.1 } },
};

const childVariants = {
  hidden: { opacity: 0, y: -12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
};

export default function Header({ account, chainMeta, onConnect, loading }) {
  return (
    <motion.header
      className="header"
      variants={headerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div className="header-brand" variants={childVariants}>
        <motion.div
          className="header-logo"
          animate={{ rotate: [0, -8, 8, -4, 4, 0] }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 5, ease: "easeInOut" }}
          whileHover={{ scale: 1.1, rotate: 15 }}
        >
          🔒
        </motion.div>
        <div>
          <motion.div className="header-title" whileHover={{ scale: 1.03 }}>
            TimeVault
          </motion.div>
          <div className="header-subtitle">Self-custody time-locked savings</div>
        </div>
      </motion.div>

      <motion.div className="header-right" variants={childVariants}>
        {account && chainMeta?.name && (
          <motion.div
            className="network-badge"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 25 }}
          >
            <span className="network-dot" />
            {chainMeta.name}
          </motion.div>
        )}
        <motion.button
          className={`btn-wallet ${account ? "connected" : "disconnected"}`}
          onClick={onConnect}
          disabled={loading}
          whileHover={{ scale: 1.05, y: -1 }}
          whileTap={{ scale: 0.95 }}
        >
          {loading ? "Connecting…" : account ? shortAddr(account) : "Connect Wallet"}
        </motion.button>
      </motion.div>
    </motion.header>
  );
}
