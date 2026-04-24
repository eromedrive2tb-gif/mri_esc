"use strict";

/**
 * Enterprise-level MRI_ESC Application Logic
 * Optimized for FiveM NUI Environment
 */

const NUI_RES_NAME = 'mri_esc';

// --- UI Utilities ---
const Nui = {
    /**
     * Sends a callback to the client-side Lua script
     * @param {string} action 
     * @param {object} data 
     */
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

// --- Rendering Engine ---
class MiraRenderer {
    constructor(canvas, isPermanent = false) {
        if (!canvas) return;
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d', { alpha: true });
        this.isPermanent = isPermanent;
        
        // Logical Resolution vs CSS Resolution
        const size = isPermanent ? 200 : 350;
        canvas.width = size;
        canvas.height = size;
        
        this.centerX = size / 2;
        this.centerY = size / 2;
        
        // Cache to avoid string allocations
        this._lastConfig = null;
        this._cachedCor = '';
        this._cachedOutline = '';
    }

    draw(config) {
        if (!this.ctx) return;
        
        const { ativo, tamanho, gap, espessura, outline, cor, opacidade, dot } = config;
        
        // Clear canvas before drawing
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        if (this.isPermanent && !ativo) return;

        const alpha = opacidade / 100;
        const mainColor = Utils.hexToRgba(cor, alpha);
        const outlineColor = `rgba(0, 0, 0, ${alpha})`;

        this.ctx.lineCap = "square";
        
        // Set global composite to ensure crisp lines
        this.ctx.imageSmoothingEnabled = false;

        // 1. Draw Outline (Background layer)
        if (outline > 0) {
            this.ctx.strokeStyle = outlineColor;
            this.ctx.lineWidth = espessura + (outline * 2);
            this._drawCrossPath(tamanho, gap, outline, true);
            
            if (dot) {
                this.ctx.fillStyle = outlineColor;
                this.ctx.beginPath();
                this.ctx.arc(this.centerX, this.centerY, (espessura / 2) + outline + 0.5, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }

        // 2. Draw Main Crosshair
        this.ctx.strokeStyle = mainColor;
        this.ctx.lineWidth = espessura;
        this._drawCrossPath(tamanho, gap, 0, false);

        if (dot) {
            this.ctx.fillStyle = mainColor;
            this.ctx.beginPath();
            this.ctx.arc(this.centerX, this.centerY, espessura / 2, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }

    _drawCrossPath(t, g, o, isOutline) {
        const offset = isOutline ? o : 0;
        
        this.ctx.beginPath();
        // Top
        this.ctx.moveTo(this.centerX, this.centerY - g - t - offset);
        this.ctx.lineTo(this.centerX, this.centerY - g + offset);
        // Bottom
        this.ctx.moveTo(this.centerX, this.centerY + g - offset);
        this.ctx.lineTo(this.centerX, this.centerY + g + t + offset);
        // Left
        this.ctx.moveTo(this.centerX - g - t - offset, this.centerY);
        this.ctx.lineTo(this.centerX - g + offset, this.centerY);
        // Right
        this.ctx.moveTo(this.centerX + g - offset, this.centerY);
        this.ctx.lineTo(this.centerX + g + t + offset, this.centerY);
        
        this.ctx.stroke();
    }
}

// --- Alpine Store & State Management ---
document.addEventListener('alpine:init', () => {
    
    Alpine.store('ui', {
        isOpen: false,
        activeTab: 'inicio',
        isAdmin: false,
        adminList: [],  // lista VIP admin — populada via SendNUIMessage 'updateAdminList'
        player: { 
            name: '', id: '', job: 'Desempregado', 
            money: 0, bank: 0, playersOn: 0 
        },
        mira: {
            ativo: false, tamanho: 12, gap: 4, espessura: 2,
            outline: 1, cor: '#FFFFFF', opacidade: 100, dot: false
        },
        redesSociais: { instagram: '', tiktok: '', youtube: '' },
        comandos: [],
        comandosSearch: '',
        plans: [],
        
        tabs: [
            { id: 'inicio', label: 'INÍCIO', icon: 'fa-bars', action: 'inicio' },
            { id: 'mapa', label: 'MAPA', icon: 'fa-map', action: 'mapa' },
            { id: 'customizacao', label: 'CUSTOMIZAÇÃO', icon: 'fa-user', action: 'customizacao' },
            { id: 'config', label: 'CONFIGURAÇÕES', icon: 'fa-cog', action: 'config' }
        ],

        vip: {
            tier: 'nenhum',
            label: 'Nenhum',
            salary: 0,
            inventory: 0,
            coins: 0,
            benefits: [],
            paycheckTime: 0,
            paycheckMax: 1800, // 30 mins em segundos
            // --- Métricas de tempo ---
            vipSince: null,    // timestamp UNIX
            vipExpires: null,  // timestamp UNIX ou null (permanente)
            daysActive: 0,
            daysLeft: null,    // null = permanente
            isExpired: false,
            // --- Métricas de ganhos ---
            totalEarned: 0,
            paycheckCount: 0,
            // --- Info do personagem ---
            charName: '',
            charJob: '',
            citizenId: ''
        },
        paycheckInterval: null,

        // --- Actions ---
        init(data) {
            if (!data) return;
            this.player = { ...this.player, ...data };
            if (data && data.vip) {
                this.updateVip(data.vip);
            }
        },

        updateVip(data) {
            this.vip.tier           = data.tier     || 'nenhum';
            this.vip.label          = data.label    || 'Sem VIP';
            this.vip.salary         = data.salary   || 0;
            this.vip.inventory      = data.inventory|| 0;
            this.vip.coins          = data.coins    || 0;
            this.vip.benefits       = Array.isArray(data.benefits) ? data.benefits : [];
            // Métricas de tempo
            this.vip.vipSince       = data.vipSince   ?? null;
            this.vip.vipExpires     = data.vipExpires ?? null;
            this.vip.daysActive     = data.daysActive || 0;
            this.vip.daysLeft       = data.daysLeft   ?? null; // null=permanente
            this.vip.isExpired      = data.isExpired  || false;
            // Métricas de ganhos
            this.vip.totalEarned    = data.totalEarned   || 0;
            this.vip.paycheckCount  = data.paycheckCount || 0;
            // Personagem
            this.vip.charName       = data.charName  || '';
            this.vip.charJob        = data.charJob   || '';
            this.vip.citizenId      = data.citizenId || '';

            if (data.interval) {
                this.vip.paycheckMax = data.interval * 60;
            }
            if (data.timeLeft !== undefined) {
                this.vip.paycheckTime = data.timeLeft;
            }
            // Lista de planos para comparativo
            if (data.allPlans) {
                this.plans = data.allPlans;
            }
            this.startPaycheckTimer();
        },

        startPaycheckTimer() {
            if (this.paycheckInterval) clearInterval(this.paycheckInterval);
            
            if (this.vip.paycheckTime <= 0) {
                this.vip.paycheckTime = this.vip.paycheckMax;
            }

            this.paycheckInterval = setInterval(() => {
                if (this.vip.paycheckTime > 0) {
                    this.vip.paycheckTime--;
                } else {
                    // Ao acabar o tempo localmente, deve aguardar a próxima abertura de menu
                    // ou resetar conforme o padrão (30min)
                    this.vip.paycheckTime = this.vip.paycheckMax;
                }
            }, 1000);
        },

        formatTime(seconds) {
            if (seconds == null || isNaN(seconds)) return "0:00";
            const m = Math.floor(seconds / 60);
            const s = seconds % 60;
            return `${m}:${s < 10 ? '0' : ''}${s}`;
        },

        formatDate(unixTs) {
            if (!unixTs || unixTs === 0) return 'Não registrada';
            const d = new Date(unixTs * 1000);
            return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        },

        formatDateTime(unixTs) {
            if (!unixTs || unixTs === 0) return 'Não registrada';
            const d = new Date(unixTs * 1000);
            return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        },
        
        getPaycheckProgress() {
            if (!this.vip.paycheckMax) return 0;
            return (this.vip.paycheckTime / this.vip.paycheckMax) * 100;
        },

        async loadMira() {
            const res = await Nui.post('consultMira');
            if (res?.tabela) {
                this.mira = { ...this.mira, ...res.tabela };
                window.miraPreview?.draw(this.mira);
            }
        },

        async saveMira() {
            await Nui.post('salvarMira', this.mira);
        },

        async loadComandos() {
            const res = await Nui.post('consultComandos');
            if (res?.tabela) this.comandos = res.tabela;
        },

        async loadRedesSociais() {
            const res = await Nui.post('consultRedesSociais');
            if (res?.success) {
                this.redesSociais = {
                    instagram: res.instagram || '',
                    tiktok: res.tiktok || '',
                    youtube: res.youtube || ''
                };
            }
        },

        async saveRedesSociais() {
            await Nui.post('salvarRedesSociais', {
                instagram: Utils.sanitize(this.redesSociais.instagram),
                tiktok: Utils.sanitize(this.redesSociais.tiktok),
                youtube: Utils.sanitize(this.redesSociais.youtube)
            });
        },

        getFilteredComandos() {
            const query = this.comandosSearch.toLowerCase();
            if (!query) return this.comandos;
            return this.comandos.filter(c => 
                c.comando.toLowerCase().includes(query) || 
                c.descricao.toLowerCase().includes(query)
            );
        },

        resetMira() {
            this.mira = {
                ativo: false, tamanho: 12, gap: 4, espessura: 2,
                outline: 1, cor: '#FFFFFF', opacidade: 100, dot: false
            };
        },

        formatMoney(val) {
            return Utils.formatMoney(val);
        }
    });
});

// --- Main Controller ---
const App = {
    init() {
        this.setupEventListeners();
    },

    setupEventListeners() {
        window.addEventListener('message', this.onMessage.bind(this));
        document.addEventListener('keydown', this.onKeyDown.bind(this));
        
        document.addEventListener('alpine:initialized', () => {
            const preview = document.getElementById('canvas-mira-preview');
            const permanent = document.getElementById('canvas-mira-permanente');
            
            if (preview) window.miraPreview = new MiraRenderer(preview);
            if (permanent) window.miraPermanente = new MiraRenderer(permanent, true);
            
            // Initial draw if needed
            Nui.post('requestMiraSync'); 
        });
    },

    onMessage(event) {
        const { action, ...data } = event.data;
        const store = Alpine.store('ui');
        if (!store) return;

        switch (action) {
            case 'showMenu':
                store.player = {
                    name: Utils.sanitize(data.nome),
                    id: data.id,
                    job: Utils.sanitize(data.job),
                    money: data.money,
                    bank: data.bank,
                    playersOn: data.playersOn
                };
                if (data && data.vip) store.updateVip(data.vip);
                if (data && data.tabs) store.tabs = data.tabs;
                store.isAdmin   = (data && data.isAdmin) || false;
                store.activeTab = 'inicio';
                store.isOpen    = true;
                break;

            case 'updateAdmin':
                store.isAdmin = data.isAdmin === true;
                break;

            case 'hideMenu':
                store.isOpen = false;
                break;

            case 'miraData':
                store.mira = { ...store.mira, ...data.mira };
                window.miraPermanente?.draw(store.mira);
                break;

            case 'updateCoins':
                store.player.money = data.coins;
                store.player.bank = data.coinsArma;
                break;

            // Lista VIP admin — enviada pelo client.lua via SendNUIMessage
            case 'updateAdminList':
                store.adminList = Array.isArray(data.list) ? data.list : [];
                if (data.allPlans) store.plans = data.allPlans;
                break;

            // Resultado de ação admin (grant/revoke/extend) — para exibir toast
            case 'adminActionResult':
                window.dispatchEvent(new CustomEvent('mri:adminResult', { detail: data }));
                break;
        }
    },

    onKeyDown(event) {
        const store = Alpine.store('ui');
        if (event.key === 'Escape' && store?.isOpen) {
            Nui.post('close');
        }
    }
};

// Global Exposure for Alpine interaction
window.Nui = Nui;
window.Utils = Utils;

App.init();


// --- Alpine Components (Clean Logic) ---
function appRoot() {
    return {
        get store() {
            return Alpine.store('ui');
        }
    };
}

function menuComponent() {
    return {
        handleTabClick(tab) {
            const store = Alpine.store('ui');
            const actions = {
                'mapa': () => Nui.post('mapa'),
                'config': () => Nui.post('config'),
                'customizacao': () => { store.activeTab = tab.id; store.loadRedesSociais(); },
                'comandos': () => { store.activeTab = tab.id; store.loadComandos(); },
                'mira': () => { store.activeTab = tab.id; store.loadMira(); },
                'default': () => { store.activeTab = tab.id; }
            };
            (actions[tab.action] || actions['default'])();
        }
    };
}

function miraComponent() {
    return {
        update() {
            const config = Alpine.store('ui').mira;
            window.miraPreview?.draw(config);
            window.miraPermanente?.draw(config);
        },
        updateMira() { this.update(); }, // Alias for HTML compatibility
        updateMiraNumber(field, min, max) {
            const store = Alpine.store('ui');
            let val = parseInt(store.mira[field]);
            if (isNaN(val)) val = min;
            store.mira[field] = Math.max(min, Math.min(max, val));
            this.update();
        },
        updateColor() {
            Alpine.store('ui').mira.cor = Utils.validateHex(Alpine.store('ui').mira.cor);
            this.update();
        },
        validateColor() { this.updateColor(); }
    };
}

// ─────────────────────────────────────────────────────────────
//  Admin VIP Panel Component
//  Dados via SendNUIMessage 'updateAdminList' → store.adminList
//  Ações via Nui.post + SendNUIMessage 'adminActionResult'
// ─────────────────────────────────────────────────────────────
function adminVipPanel() {
    return {
        search: '',
        searchResults: [],
        searching: false,
        loading: false,
        toast: null,
        subTab: 'players', // 'players' ou 'plans'
        plans: [],
        searchPlans: '',

        modal: {
            open: false,
            mode: 'grant',
            citizenId: '',
            playerName: '',
            tier: 'tier1',
            duration: '30',
        },

        planModal: {
            open: false,
            isNew: true,
            id: '',
            label: '',
            payment: 0,
            inventory: 0,
            benefits: []
        },

        confirm: {
            open: false,
            citizenId: '',
            playerName: '',
        },

        // Lista vem do store (populada via SendNUIMessage)
        get list() { return Alpine.store('ui').adminList || []; },

        // ── init ──────────────────────────────────────────────
        init() {
            this.loadPlans();
            // Escuta resultados de ações (grant/revoke/extend)
            window.addEventListener('mri:adminResult', (e) => {
                const { operation, result } = e.detail || {};
                if (result?.success) {
                    const msgs = { grant: 'VIP concedido!', revoke: 'VIP revogado.', extend: 'VIP renovado!' };
                    this.showToast('success', msgs[operation] || 'Operação realizada.');
                } else {
                    this.showToast('error', result?.error || 'Erro desconhecido');
                }
            });
        },

        // ── helpers ───────────────────────────────────────────
        showToast(type, msg) {
            this.toast = { type, msg };
            setTimeout(() => { this.toast = null; }, 3500);
        },

        formatDate(ts) {
            if (!ts || ts === 0) return 'Não registrada';
            return new Date(ts * 1000).toLocaleDateString('pt-BR', {
                day: '2-digit', month: '2-digit', year: 'numeric'
            });
        },

        getPlanLabel(tierId) {
            if (!tierId || tierId === 'nenhum') return 'S/ VIP';
            const query = tierId.toLowerCase();
            const plan = (Alpine.store('ui').plans || []).find(p => p.id.toLowerCase() === query);
            return plan ? plan.label : `ID: ${tierId} (Inexistente)`;
        },

        formatMoney(n) { return Utils.formatMoney(n); },

        statusClass(row) {
            if (!row.expires_at) return 'st-perm';
            const now  = Math.floor(Date.now() / 1000);
            const diff = row.expires_at - now;
            if (diff <= 0)         return 'st-expired';
            if (diff <= 7 * 86400) return 'st-warn';
            return 'st-ok';
        },

        statusLabel(row) {
            if (!row.expires_at) return '∞ Permanente';
            const now  = Math.floor(Date.now() / 1000);
            const diff = row.expires_at - now;
            if (diff <= 0) return 'EXPIRADO';
            return `${Math.floor(diff / 86400)}d restantes`;
        },

        filtered() {
            const q = this.search.toLowerCase().trim();
            if (!q) return this.list;
            return this.list.filter(r =>
                r.citizenid?.toLowerCase().includes(q) ||
                r.name?.toLowerCase().includes(q)
            );
        },

        // ── refresh (ATUALIZAR btn) — push-based ───────────────
        async loadList() {
            this.loading = true;
            await Nui.post('vipAdminRefresh'); // cb({}) imediato; dados chegam via updateAdminList
            setTimeout(() => { this.loading = false; }, 1500);
        },

        // ── player search (for grant to non-VIP) ──────────────
        async searchPlayer() {
            if (this.search.length < 2) return;
            this.searching = true;
            const res = await Nui.post('vipAdminSearch', { query: this.search });
            this.searchResults = Array.isArray(res) ? res : [];
            this.searching = false;
        },

        // ── open grant modal ───────────────────────────────────
        openGrant(citizenId, name) {
            const firstTier = (Alpine.store('ui').plans && Alpine.store('ui').plans[0]) 
                ? Alpine.store('ui').plans[0].id 
                : 'tier1';
            this.modal = {
                open: true, mode: 'grant', citizenId,
                playerName: name || citizenId,
                tier: firstTier, duration: '30',
            };
        },

        // ── open extend modal ──────────────────────────────────
        openExtend(row) {
            this.modal = {
                open: true, mode: 'extend',
                citizenId: row.citizenid,
                playerName: row.name || row.citizenid,
                tier: row.tier, duration: '30',
            };
        },

        // ── confirm grant / extend (fire-and-forget) ───────────
        confirmGrant() {
            const days      = parseInt(this.modal.duration) || 0;
            const mode      = this.modal.mode;
            const citizenId = this.modal.citizenId;

            if (mode === 'grant') {
                Nui.post('vipAdminGrant', { citizenId, tier: this.modal.tier, durationDays: days });
            } else {
                Nui.post('vipAdminExtend', { citizenId, tier: this.modal.tier, days });
            }

            this.modal.open = false;
            // Toast e refresh chegam via SendNUIMessage 'adminActionResult' + 'updateAdminList'
        },

        // ── open revoke confirm ────────────────────────────────
        openRevoke(row) {
            this.confirm = {
                open: true,
                citizenId:  row.citizenid,
                playerName: row.name || row.citizenid,
            };
        },

        // ── execute revoke (fire-and-forget) ───────────────────
        executeRevoke() {
            const citizenId = this.confirm.citizenId;
            this.confirm.open = false;
            Nui.post('vipAdminRevoke', { citizenId });
            // Toast e refresh chegam via eventos
        },

        // ── GERENCIAMENTO DE PLANOS (CRUD) ──────────────────────
        async loadPlans() {
            this.loading = true;
            try {
                const res = await Nui.post('vipAdminGetPlans');
                this.plans = Array.isArray(res) ? res : [];
            } catch (e) { console.error(e); }
            this.loading = false;
        },

        filteredPlans() {
            const q = this.searchPlans.toLowerCase().trim();
            if (!q) return this.plans;
            return this.plans.filter(p => 
                p.label.toLowerCase().includes(q) || 
                p.id.toLowerCase().includes(q)
            );
        },

        openPlanModal(plan = null) {
            if (plan) {
                this.planModal = {
                    open: true, isNew: false,
                    id: plan.id, label: plan.label,
                    payment: plan.payment, inventory: plan.inventory,
                    benefits: Array.isArray(plan.benefits) ? [...plan.benefits] : []
                };
            } else {
                this.planModal = {
                    open: true, isNew: true,
                    id: '', label: '',
                    payment: 5000, inventory: 100,
                    benefits: ['']
                };
            }
        },

        async savePlan() {
            if (!this.planModal.id || !this.planModal.label) {
                return this.showToast('error', 'Preencha ID e Nome.');
            }
            
            const data = {
                id: this.planModal.id.trim().toLowerCase().replace(/\s+/g, '_'),
                label: this.planModal.label.trim(),
                payment: parseInt(this.planModal.payment) || 0,
                inventory: parseInt(this.planModal.inventory) || 0,
                benefits: this.planModal.benefits.map(b => b.trim()).filter(b => b !== '')
            };

            const res = await Nui.post('vipAdminSavePlan', data);
            if (res && res.success) {
                this.showToast('success', 'Plano salvo com sucesso!');
                this.planModal.open = false;
                this.loadPlans();
            } else {
                this.showToast('error', res?.error || 'Erro ao salvar plano.');
            }
        },

        async deletePlan(id) {
            if (confirm(`Atenção: Deseja realmente excluir o plano "${id}"? Isso não removerá o cargo dos jogadores que já o possuem, mas eles perderão os benefícios.`)) {
                const res = await Nui.post('vipAdminDeletePlan', { id });
                if (res && res.success) {
                    this.showToast('success', 'Plano removido.');
                    this.loadPlans();
                } else {
                    this.showToast('error', res?.error || 'Erro ao excluir.');
                }
            }
        }
    };
}
