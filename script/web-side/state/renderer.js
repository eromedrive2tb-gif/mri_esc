/**
 * renderer.js - MiraRenderer Engine
 */

class MiraRenderer {
    constructor(canvas, isPermanent = false) {
        if (!canvas) return;
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d', { alpha: true });
        this.isPermanent = isPermanent;
        
        const size = isPermanent ? 200 : 350;
        canvas.width = size;
        canvas.height = size;
        
        this.centerX = size / 2;
        this.centerY = size / 2;
    }

    draw(config) {
        if (!this.ctx) return;
        const { ativo, tamanho, gap, espessura, outline, cor, opacidade, dot } = config;
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        if (this.isPermanent && !ativo) return;

        const alpha = opacidade / 100;
        const mainColor = Utils.hexToRgba(cor, alpha);
        const outlineColor = `rgba(0, 0, 0, ${alpha})`;

        this.ctx.lineCap = "square";
        this.ctx.imageSmoothingEnabled = false;

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
        this.ctx.moveTo(this.centerX, this.centerY - g - t - offset);
        this.ctx.lineTo(this.centerX, this.centerY - g + offset);
        this.ctx.moveTo(this.centerX, this.centerY + g - offset);
        this.ctx.lineTo(this.centerX, this.centerY + g + t + offset);
        this.ctx.moveTo(this.centerX - g - t - offset, this.centerY);
        this.ctx.lineTo(this.centerX - g + offset, this.centerY);
        this.ctx.moveTo(this.centerX + g - offset, this.centerY);
        this.ctx.lineTo(this.centerX + g + t + offset, this.centerY);
        this.ctx.stroke();
    }
}

window.MiraRenderer = MiraRenderer;
