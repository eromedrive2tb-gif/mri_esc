/**
 * bridge.js - Communication and Utilities
 */

const NUI_RES_NAME = 'mri_esc';

const Nui = {
    async post(action, data = {}) {
        try {
            const resp = await fetch(`https://${NUI_RES_NAME}/${action}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            return await resp.json();
        } catch (e) {
            return { error: true, msg: 'Fetch failed' };
        }
    }
};

const Utils = {
    formatMoney: (n) => {
        if (n == null) return "$ 0";
        return "$ " + n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    },
    
    sanitize: (str) => {
        if (typeof str !== 'string') return '';
        return str.replace(/[<>"']/g, '').trim();
    },
    
    validateHex: (color) => {
        return /^#[0-9A-F]{6}$/i.test(color) ? color.toUpperCase() : '#FFFFFF';
    },

    hexToRgba: (hex, alpha) => {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
};

window.Nui = Nui;
window.Utils = Utils;
