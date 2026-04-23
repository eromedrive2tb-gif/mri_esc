const Nui = {
    post: (action, data = {}) => {
        return fetch(`https://mri_esc/${action}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        }).then(res => res.json()).catch(() => ({}));
    }
};

const formatMoney = (n) => {
    if (n === undefined || n === null) return "$ 0";
    return "$ " + n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

const sanitizeInput = (str) => {
    if (typeof str !== 'string') return '';
    return str.replace(/[<>"']/g, '');
};

const validateHexColor = (color) => {
    return /^#[0-9A-F]{6}$/i.test(color) ? color.toUpperCase() : '#FFFFFF';
};

class MiraRenderer {
    constructor(canvas, isPermanent = false) {
        this.canvas = canvas;
        this.ctx = canvas?.getContext('2d');
        this.isPermanent = isPermanent;
        if (canvas) {
            canvas.width = isPermanent ? 200 : 350;
            canvas.height = isPermanent ? 200 : 350;
        }
    }

    hexToRgba(hex, alpha) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return {
            color: `rgba(${r}, ${g}, ${b}, ${alpha})`,
            outline: `rgba(0, 0, 0, ${alpha})`
        };
    }

    draw(config) {
        if (!this.ctx || !this.canvas) return;
        
        const { ativo, tamanho, gap, espessura, outline, cor, opacidade, dot } = config;
        if (this.isPermanent && !ativo) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            return;
        }

        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const alpha = opacidade / 100;
        const { color: corRGBA, outline: outlineRGBA } = this.hexToRgba(cor, alpha);

        this.ctx.lineCap = "square";
        this.ctx.lineJoin = "miter";

        if (outline > 0) {
            this.ctx.strokeStyle = outlineRGBA;
            this.ctx.lineWidth = espessura + (outline * 2);
            
            this.ctx.beginPath();
            this.ctx.moveTo(centerX, centerY - gap - tamanho - outline);
            this.ctx.lineTo(centerX, centerY - gap + outline);
            this.ctx.stroke();
            
            this.ctx.beginPath();
            this.ctx.moveTo(centerX, centerY + gap - outline);
            this.ctx.lineTo(centerX, centerY + gap + tamanho + outline);
            this.ctx.stroke();
            
            this.ctx.beginPath();
            this.ctx.moveTo(centerX - gap - tamanho - outline, centerY);
            this.ctx.lineTo(centerX - gap + outline, centerY);
            this.ctx.stroke();
            
            this.ctx.beginPath();
            this.ctx.moveTo(centerX + gap - outline, centerY);
            this.ctx.lineTo(centerX + gap + tamanho + outline, centerY);
            this.ctx.stroke();

            if (dot) {
                this.ctx.fillStyle = outlineRGBA;
                this.ctx.beginPath();
                this.ctx.arc(centerX, centerY, (espessura / 2) + outline + 1, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }

        this.ctx.strokeStyle = corRGBA;
        this.ctx.lineWidth = espessura;

        this.ctx.beginPath();
        this.ctx.moveTo(centerX, centerY - gap - tamanho);
        this.ctx.lineTo(centerX, centerY - gap);
        this.ctx.stroke();

        this.ctx.beginPath();
        this.ctx.moveTo(centerX, centerY + gap);
        this.ctx.lineTo(centerX, centerY + gap + tamanho);
        this.ctx.stroke();

        this.ctx.beginPath();
        this.ctx.moveTo(centerX - gap - tamanho, centerY);
        this.ctx.lineTo(centerX - gap, centerY);
        this.ctx.stroke();

        this.ctx.beginPath();
        this.ctx.moveTo(centerX + gap, centerY);
        this.ctx.lineTo(centerX + gap + tamanho, centerY);
        this.ctx.stroke();

        if (dot) {
            this.ctx.fillStyle = corRGBA;
            this.ctx.beginPath();
            this.ctx.arc(centerX, centerY, espessura / 2, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }

    clear() {
        if (this.ctx && this.canvas) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }
}

document.addEventListener('alpine:init', () => {
    isAlpineReady = true;

    Alpine.store('ui', {
        isOpen: false,
        isInitialized: false,
        ready: false,
        activeTab: 'inicio',
        player: {
            name: '',
            id: '',
            job: 'Desempregado',
            money: 0,
            bank: 0,
            playersOn: 0
        },
        mira: {
            ativo: false,
            tamanho: 12,
            gap: 4,
            espessura: 2,
            outline: 1,
            cor: '#FFFFFF',
            opacidade: 100,
            dot: false
        },
        redesSociais: {
            instagram: '',
            tiktok: '',
            youtube: ''
        },
        comandos: [],
        comandosSearch: '',
        tabs: [
            { id: 'inicio', label: 'INÍCIO', icon: 'fa-bars', action: 'inicio' },
            { id: 'mapa', label: 'MAPA', icon: 'fa-map', action: 'mapa' },
            { id: 'customizacao', label: 'CUSTOMIZAÇÃO', icon: 'fa-user', action: 'customizacao' },
            { id: 'config', label: 'CONFIGURAÇÕES', icon: 'fa-cog', action: 'config' }
        ],

        setPlayer(data) {
            this.player = { ...this.player, ...data };
        },

        setMira(data) {
            this.mira = { ...this.mira, ...data };
        },

        setComandos(data) {
            this.comandos = data;
        },

        setRedesSociais(data) {
            this.redesSociais = { ...this.redesSociais, ...data };
        },

        addTab(tab) {
            if (!this.tabs.find(t => t.id === tab.id)) {
                this.tabs.push(tab);
            }
        },

        removeTab(tabId) {
            this.tabs = this.tabs.filter(t => t.id !== tabId);
        },

        setActiveTab(tabId) {
            this.activeTab = tabId;
        },

        open() {
            this.isOpen = true;
            this.isInitialized = true;
            setTimeout(() => {
                this.ready = true;
            }, 100);
        },

        close() {
            this.isOpen = false;
            this.activeTab = 'inicio';
            this.ready = false;
        },

        formatMoney(val) {
            return formatMoney(val);
        },

        isReady() {
            return this.isInitialized;
        },

        async loadComandos() {
            const data = await Nui.post('consultComandos', {});
            if (data && data.tabela) {
                this.setComandos(data.tabela);
            }
        },

        async loadRedesSociais() {
            const data = await Nui.post('consultRedesSociais', {});
            if (data && data.success) {
                this.setRedesSociais({
                    instagram: data.instagram || '',
                    tiktok: data.tiktok || '',
                    youtube: data.youtube || ''
                });
            }
        },

        async loadMira() {
            const data = await Nui.post('consultMira', {});
            if (data && data.tabela) {
                this.setMira(data.tabela);
            }
        },

        async saveMira() {
            await Nui.post('salvarMira', this.mira);
        },

        async saveRedesSociais() {
            await Nui.post('salvarRedesSociais', {
                instagram: sanitizeInput(this.redesSociais.instagram),
                tiktok: sanitizeInput(this.redesSociais.tiktok),
                youtube: sanitizeInput(this.redesSociais.youtube)
            });
        },

        async executarComando(comando) {
            const data = await Nui.post('executarComando', { comando });
            if (data && data.success) {
                Nui.post('close');
            }
        },

        getFilteredComandos() {
            const search = (this.comandosSearch || '').toLowerCase();
            if (!search) return this.comandos;
            return this.comandos.filter(cmd => 
                (cmd.comando || '').toLowerCase().includes(search) ||
                (cmd.descricao || '').toLowerCase().includes(search)
            );
        },

        resetMira() {
            this.mira = {
                ativo: false,
                tamanho: 12,
                gap: 4,
                espessura: 2,
                outline: 1,
                cor: '#FFFFFF',
                opacidade: 100,
                dot: false
            };
        },

        validateAndSetColor(hex) {
            const validHex = validateHexColor(hex);
            this.mira.cor = validHex;
            return validHex;
        }
    });
});

let miraPreview = null;
let miraPermanente = null;
let isAlpineReady = false;

document.addEventListener('alpine:init', () => {
    isAlpineReady = true;
});

window.addEventListener('message', async (event) => {
    if (!isAlpineReady) {
        console.log('[MRI_ESC] Message received but Alpine not ready, action:', event.data?.action);
        return;
    }
    
    const action = event.data?.action;
    const store = Alpine.store('ui');
    if (!store) return;

    const container = document.getElementById('container');
    const containerFake = document.getElementById('containerFake');
    const miraPerm = document.getElementById('mira-permanente');

    switch (action) {
        case 'showMenu':
            store.setPlayer({
                name: sanitizeInput(event.data.nome),
                id: event.data.id,
                job: sanitizeInput(event.data.job),
                money: event.data.money,
                bank: event.data.bank,
                playersOn: event.data.playersOn
            });
            if (event.data.tabs) {
                store.tabs = event.data.tabs;
            }
            store.setActiveTab('inicio');
            store.open();
            
            if (container) container.style.display = 'block';
            if (containerFake) containerFake.style.display = 'block';
            if (miraPerm) miraPerm.style.display = 'none';
            break;

        case 'hideMenu':
            store.close();
            
            if (container) container.style.display = 'none';
            if (containerFake) containerFake.style.display = 'none';
            if (miraPerm && store.mira.ativo) {
                miraPerm.style.display = 'flex';
            }
            break;

        case 'miraData':
            store.setMira(event.data.mira);
            if (miraPermanente) {
                const uiStore = Alpine.store('ui');
                miraPermanente.draw(uiStore.mira);
            }
            break;

        case 'updateCoins':
            store.setPlayer({ money: event.data.coins, bank: event.data.coinsArma });
            break;
    }
});

document.addEventListener('keydown', (data) => {
    const store = Alpine.store('ui');
    if (!store || !store.isReady()) return;
    
    if (data.key === 'Escape' && store.isOpen) {
        Nui.post('close');
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const previewCanvas = document.getElementById('canvas-mira-preview');
    const permanentCanvas = document.getElementById('canvas-mira-permanente');
    
    if (previewCanvas) {
        miraPreview = new MiraRenderer(previewCanvas, false);
    }
    if (permanentCanvas) {
        miraPermanente = new MiraRenderer(permanentCanvas, true);
    }
});

document.addEventListener('alpine:initialized', () => {
    const previewCanvas = document.getElementById('canvas-mira-preview');
    const permanentCanvas = document.getElementById('canvas-mira-permanente');
    
    if (previewCanvas) {
        window.miraPreview = new MiraRenderer(previewCanvas, false);
    }
    if (permanentCanvas) {
        window.miraPermanente = new MiraRenderer(permanentCanvas, true);
    }
});

window.MiraRenderer = MiraRenderer;
window.Nui = Nui;