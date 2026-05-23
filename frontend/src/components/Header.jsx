import React from "react";
import { motion } from "framer-motion";
import { shortAddr } from "../utils/format";
import { BrandMark, WalletIcon } from "./Icons";

export default function Header({ account, chainMeta, onConnect, loading }) {
  return (
    <motion.header
      className="header"
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: .5, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="header-brand">
        <div className="brand-logo-wrap">
          <BrandMark size={28} />
        </div>
        <div className="brand-text">
          <span className="brand-name">TimeVault</span>
          <span className="brand-sub">Private · Self-Custody · Time-Locked</span>
        </div>
      </div>

      <div className="header-right">
        {account && chainMeta?.name && (
          <motion.div
            className="pill"
            initial={{ opacity: 0, scale: .9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 25 }}
          >
            <span className="pill-dot" />
            {chainMeta.name}
          </motion.div>
        )}
        <motion.button
          className={`btn-wallet ${account ? "connected" : "disconnected"}`}
          onClick={onConnect}
          disabled={loading}
          whileHover={!loading ? { y: -1 } : {}}
          whileTap={!loading ? { scale: 0.96 } : {}}
        >
          <WalletIcon size={16} />
          {loading ? "Connecting…" : account ? shortAddr(account) : "Connect"}
        </motion.button>
      </div>
    </motion.header>
  );
}
