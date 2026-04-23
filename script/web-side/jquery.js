
let open = false

$(document).ready(function(){

	canvasMiraPermanente = document.getElementById("canvas-mira-permanente");
	if(canvasMiraPermanente){
		ctxMiraPermanente = canvasMiraPermanente.getContext("2d");
		canvasMiraPermanente.width = 200;
		canvasMiraPermanente.height = 200;
		InicializarMiraPermanente();
	}
	
	window.addEventListener("message",async function(event){

	$(".search-pelucias-fake input").on("keyup", function () {
		let search = $(this).val().toLowerCase();
		$(".nome-item-pelucia").filter(function () {
		  $(this).closest(".item-pelucia").toggle($(this).text().toLowerCase().indexOf(search) > -1)
		});
	});

	$(".search-comandos-fake input").on("keyup", function () {
		let search = $(this).val().toLowerCase();
		$(".item-comando-texto").filter(function () {
		  $(this).closest(".item-comando").toggle($(this).text().toLowerCase().indexOf(search) > -1)
		});
	});

		switch(event.data.action){
			case "showMenu":
				var item = event.data
				$("#jogadoresonline").text(item.playersOn);
				$("#nome-usuario").text(item.nome);
				$("#id-usuario").text(item.id);
				$("#job-usuario").text(item.job);
				
				// Atualiza Dinheiro e Banco
				$("#coins").text(formatMoney(item.money));
				$("#coins-arma").text(formatMoney(item.bank));

				TrocarContainer("inicio");
				AbrirInterface()

				open = false
				await Wait(500)
				open = true
			break;
			case "hideMenu":
				FecharInterface()
				open = false
			break;
			case "miraData":
				miraConfig = event.data.mira;
				InicializarMiraPermanente();
			break;
			case "showMercadoPelucias":
				TrocarContainer('');
				AbrirInterface()
				$("#container-mercado-pelucias").fadeIn(500);
				$("#nome-mercado-pelucias").text(event.data.nome);
				$("#receber-mercado-pelucias").text(event.data.receber);
				TrocarTabMercadoPelucias('anuncios');
				open = false
				await Wait(500)
				open = true
			break;
			case "fecharPopupVender":
				FecharPopupVender();
			break;
			case "hideMercadoPelucias":
				$("#container-mercado-pelucias").fadeOut(500);
				FecharPopupVender();
			break;
			case "updateCoins":
				$("#coins").text(event.data.coins);
				$("#coins-arma").text(event.data.coinsArma);
			break;
		}
	});
	document.onkeyup = function(data) {
        console.log("[MRI_ESC DEBUG JS] Key pressed:", data.which);
		if (data.which == 27){
            console.log("[MRI_ESC DEBUG JS] ESC pressed! Variable open is:", open);
			if (open == true) {
                console.log("[MRI_ESC DEBUG JS] Closing interface and sending POST close...");
				FecharInterface()
				$.post("https://mri_esc/close", JSON.stringify({}));
			}
		}
	};
});

AbrirInterface = function(){
	$(".containerFake").fadeIn(500);
	$(".container").fadeIn(500);
	if(miraConfig.ativo){
		$("#mira-permanente").hide();
	}
}

FecharInterface = function(){
	$(".containerFake").fadeOut(500);
	$(".container").fadeOut(500);
	if(miraConfig.ativo){
		$("#mira-permanente").show();
	}
}



Fechar = function(){
	$.post("https://mri_esc/close");
}

Config = function(){
	$.post("https://mri_esc/config");
}

Mapa = function(){
	$.post("https://mri_esc/mapa");
}

TrocarContainer = function(container){
	$(".containerOpcoes").hide();
	$(".container-customizacao").hide();
	$(".container-mira").hide();
	$(".container-comandos").hide();
	$(".botao-header").removeClass("active");

	if (container == "inicio"){
		$(".botao-header[onclick*=\"TrocarContainer('inicio')\"]").addClass("active");
		$(".containerOpcoes").show();
	} else if (container == "customizacao"){
		consultRedesSociais()
		$(".botao-header[onclick*=\"TrocarContainer('customizacao')\"]").addClass("active");
		$(".container-customizacao").show();
	} else if (container == "mira"){
		$.post("https://mri_esc/consultMira", function(data){
			miraConfig = data.tabela;
		});
		$(".container-mira").show();
		InicializarMira();
	} else if (container == "comandos"){
		consultComandos()
		$(".container-comandos").show();
	}
}

Wait = function(time){
	return new Promise(resolve => setTimeout(resolve, time));
}

let miraConfig = {
	ativo: false,
	tamanho: 12,
	gap: 4,
	espessura: 2,
	outline: 1,
	cor: "#FFFFFF",
	opacidade: 100,
	dot: false
};

let canvasMira = null;
let ctxMira = null;
let canvasMiraPermanente = null;
let ctxMiraPermanente = null;

let miraInicializada = false;

InicializarMira = function(){
	if(canvasMira === null){
		canvasMira = document.getElementById("canvas-mira-preview");
		if(canvasMira){
			ctxMira = canvasMira.getContext("2d");
			canvasMira.width = 350;
			canvasMira.height = 350;
		}
	}

	$("#mira-tamanho").val(miraConfig.tamanho);
	$("#mira-tamanho-valor").val(miraConfig.tamanho);
	$("#mira-gap").val(miraConfig.gap);
	$("#mira-gap-valor").val(miraConfig.gap);
	$("#mira-espessura").val(miraConfig.espessura);
	$("#mira-espessura-valor").val(miraConfig.espessura);
	$("#mira-outline").val(miraConfig.outline);
	$("#mira-outline-valor").val(miraConfig.outline);
	$("#mira-cor").val(miraConfig.cor);
	$("#mira-cor-hex").val(miraConfig.cor);
	$("#mira-opacidade").val(miraConfig.opacidade);
	$("#mira-opacidade-valor").val(miraConfig.opacidade);
	$("#mira-dot").prop("checked", miraConfig.dot);
	$("#mira-ativo").prop("checked", miraConfig.ativo);
	

	DesenharMira();
	
	if(miraInicializada) return;
	miraInicializada = true;
	
	$("#mira-tamanho").on("input", function(){
		let val = parseInt($(this).val());
		miraConfig.tamanho = val;
		$("#mira-tamanho-valor").val(val);
		DesenharMira();
	});
	
	$("#mira-gap").on("input", function(){
		let val = parseInt($(this).val());
		miraConfig.gap = val;
		$("#mira-gap-valor").val(val);
		DesenharMira();
	});
	
	$("#mira-espessura").on("input", function(){
		let val = parseInt($(this).val());
		miraConfig.espessura = val;
		$("#mira-espessura-valor").val(val);
		DesenharMira();
	});
	
	$("#mira-outline").on("input", function(){
		let val = parseInt($(this).val());
		miraConfig.outline = val;
		$("#mira-outline-valor").val(val);
		DesenharMira();
	});
	
	$("#mira-opacidade").on("input", function(){
		let val = parseInt($(this).val());
		miraConfig.opacidade = val;
		$("#mira-opacidade-valor").val(val);
		DesenharMira();
	});
	
	$("#mira-tamanho-valor").on("input", function(){
		let val = parseInt($(this).val()) || 0;
		val = Math.max(0, Math.min(50, val));
		miraConfig.tamanho = val;
		$("#mira-tamanho").val(val);
		$(this).val(val);
		DesenharMira();
	});
	
	$("#mira-gap-valor").on("input", function(){
		let val = parseInt($(this).val()) || 0;
		val = Math.max(0, Math.min(20, val));
		miraConfig.gap = val;
		$("#mira-gap").val(val);
		$(this).val(val);
		DesenharMira();
	});
	
	$("#mira-espessura-valor").on("input", function(){
		let val = parseInt($(this).val()) || 1;
		val = Math.max(1, Math.min(10, val));
		miraConfig.espessura = val;
		$("#mira-espessura").val(val);
		$(this).val(val);
		DesenharMira();
	});
	
	$("#mira-outline-valor").on("input", function(){
		let val = parseInt($(this).val()) || 0;
		val = Math.max(0, Math.min(5, val));
		miraConfig.outline = val;
		$("#mira-outline").val(val);
		$(this).val(val);
		DesenharMira();
	});
	
	$("#mira-opacidade-valor").on("input", function(){
		let val = parseInt($(this).val()) || 0;
		val = Math.max(0, Math.min(100, val));
		miraConfig.opacidade = val;
		$("#mira-opacidade").val(val);
		$(this).val(val);
		DesenharMira();
	});
	
	// Event listeners para cor
	$("#mira-cor").on("input", function(){
		let val = $(this).val();
		miraConfig.cor = val;
		$("#mira-cor-hex").val(val.toUpperCase());
		DesenharMira();
	});
	
	$("#mira-cor-hex").on("input", function(){
		let val = $(this).val();
		if(/^#[0-9A-F]{6}$/i.test(val)){
			miraConfig.cor = val.toUpperCase();
			$("#mira-cor").val(val.toUpperCase());
			DesenharMira();
		}
	});
	
	// Event listener para dot
	$("#mira-dot").on("change", function(){
		miraConfig.dot = $(this).is(":checked");
		DesenharMira();
	});
	
	// Event listener para ativo
	$("#mira-ativo").on("change", function(){
		miraConfig.ativo = $(this).is(":checked");
		if(miraConfig.ativo){
			DesenharMiraPermanente();
		} else {
			ctxMiraPermanente.clearRect(0, 0, canvasMiraPermanente.width, canvasMiraPermanente.height);
		}
	});
}

AtualizarEstadoMira = function(){
	if(miraConfig.ativo){
		$("#mira-permanente").show();
	} else {
		$("#mira-permanente").hide();
	}
}

DesenharMira = function(){
	if(!ctxMira || !canvasMira) return;
	
	ctxMira.clearRect(0, 0, canvasMira.width, canvasMira.height);
	
	let centerX = canvasMira.width / 2;
	let centerY = canvasMira.height / 2;
	
	// Converter cor hex para RGBA com opacidade
	let r = parseInt(miraConfig.cor.slice(1, 3), 16);
	let g = parseInt(miraConfig.cor.slice(3, 5), 16);
	let b = parseInt(miraConfig.cor.slice(5, 7), 16);
	let alpha = miraConfig.opacidade / 100;
	
	let corRGBA = `rgba(${r}, ${g}, ${b}, ${alpha})`;
	let outlineRGBA = `rgba(0, 0, 0, ${alpha})`;
	
	ctxMira.lineCap = "square";
	ctxMira.lineJoin = "miter";
	
	// Desenhar contorno primeiro (se outline > 0)
	if(miraConfig.outline > 0){
		ctxMira.strokeStyle = outlineRGBA;
		ctxMira.lineWidth = miraConfig.espessura + (miraConfig.outline * 2);
		
		// Linha superior
		ctxMira.beginPath();
		ctxMira.moveTo(centerX, centerY - miraConfig.gap - miraConfig.tamanho - miraConfig.outline);
		ctxMira.lineTo(centerX, centerY - miraConfig.gap + miraConfig.outline);
		ctxMira.stroke();
		
		// Linha inferior
		ctxMira.beginPath();
		ctxMira.moveTo(centerX, centerY + miraConfig.gap - miraConfig.outline);
		ctxMira.lineTo(centerX, centerY + miraConfig.gap + miraConfig.tamanho + miraConfig.outline);
		ctxMira.stroke();
		
		// Linha esquerda
		ctxMira.beginPath();
		ctxMira.moveTo(centerX - miraConfig.gap - miraConfig.tamanho - miraConfig.outline, centerY);
		ctxMira.lineTo(centerX - miraConfig.gap + miraConfig.outline, centerY);
		ctxMira.stroke();
		
		// Linha direita
		ctxMira.beginPath();
		ctxMira.moveTo(centerX + miraConfig.gap - miraConfig.outline, centerY);
		ctxMira.lineTo(centerX + miraConfig.gap + miraConfig.tamanho + miraConfig.outline, centerY);
		ctxMira.stroke();
		
		// Dot com contorno
		if(miraConfig.dot){
			ctxMira.fillStyle = outlineRGBA;
			ctxMira.beginPath();
			ctxMira.arc(centerX, centerY, (miraConfig.espessura / 2) + miraConfig.outline + 1, 0, Math.PI * 2);
			ctxMira.fill();
		}
	}
	
	// Desenhar mira principal
	ctxMira.strokeStyle = corRGBA;
	ctxMira.lineWidth = miraConfig.espessura;
	
	// Linha superior
	ctxMira.beginPath();
	ctxMira.moveTo(centerX, centerY - miraConfig.gap - miraConfig.tamanho);
	ctxMira.lineTo(centerX, centerY - miraConfig.gap);
	ctxMira.stroke();
	
	// Linha inferior
	ctxMira.beginPath();
	ctxMira.moveTo(centerX, centerY + miraConfig.gap);
	ctxMira.lineTo(centerX, centerY + miraConfig.gap + miraConfig.tamanho);
	ctxMira.stroke();
	
	// Linha esquerda
	ctxMira.beginPath();
	ctxMira.moveTo(centerX - miraConfig.gap - miraConfig.tamanho, centerY);
	ctxMira.lineTo(centerX - miraConfig.gap, centerY);
	ctxMira.stroke();
	
	// Linha direita
	ctxMira.beginPath();
	ctxMira.moveTo(centerX + miraConfig.gap, centerY);
	ctxMira.lineTo(centerX + miraConfig.gap + miraConfig.tamanho, centerY);
	ctxMira.stroke();
	
	// Dot central
	if(miraConfig.dot){
		ctxMira.fillStyle = corRGBA;
		ctxMira.beginPath();
		ctxMira.arc(centerX, centerY, miraConfig.espessura / 2, 0, Math.PI * 2);
		ctxMira.fill();
	}
	
	// Desenhar também no canvas permanente
	DesenharMiraPermanente();
}

DesenharMiraPermanente = function(){
	if(!ctxMiraPermanente || !canvasMiraPermanente) return;
	if(!miraConfig.ativo) return;
	
	ctxMiraPermanente.clearRect(0, 0, canvasMiraPermanente.width, canvasMiraPermanente.height);
	
	let centerX = canvasMiraPermanente.width / 2;
	let centerY = canvasMiraPermanente.height / 2;
	
	// Converter cor hex para RGBA com opacidade
	let r = parseInt(miraConfig.cor.slice(1, 3), 16);
	let g = parseInt(miraConfig.cor.slice(3, 5), 16);
	let b = parseInt(miraConfig.cor.slice(5, 7), 16);
	let alpha = miraConfig.opacidade / 100;
	
	let corRGBA = `rgba(${r}, ${g}, ${b}, ${alpha})`;
	let outlineRGBA = `rgba(0, 0, 0, ${alpha})`;
	
	ctxMiraPermanente.lineCap = "square";
	ctxMiraPermanente.lineJoin = "miter";
	
	// Desenhar contorno primeiro (se outline > 0)
	if(miraConfig.outline > 0){
		ctxMiraPermanente.strokeStyle = outlineRGBA;
		ctxMiraPermanente.lineWidth = miraConfig.espessura + (miraConfig.outline * 2);
		
		// Linha superior
		ctxMiraPermanente.beginPath();
		ctxMiraPermanente.moveTo(centerX, centerY - miraConfig.gap - miraConfig.tamanho - miraConfig.outline);
		ctxMiraPermanente.lineTo(centerX, centerY - miraConfig.gap + miraConfig.outline);
		ctxMiraPermanente.stroke();
		
		// Linha inferior
		ctxMiraPermanente.beginPath();
		ctxMiraPermanente.moveTo(centerX, centerY + miraConfig.gap - miraConfig.outline);
		ctxMiraPermanente.lineTo(centerX, centerY + miraConfig.gap + miraConfig.tamanho + miraConfig.outline);
		ctxMiraPermanente.stroke();
		
		// Linha esquerda
		ctxMiraPermanente.beginPath();
		ctxMiraPermanente.moveTo(centerX - miraConfig.gap - miraConfig.tamanho - miraConfig.outline, centerY);
		ctxMiraPermanente.lineTo(centerX - miraConfig.gap + miraConfig.outline, centerY);
		ctxMiraPermanente.stroke();
		
		// Linha direita
		ctxMiraPermanente.beginPath();
		ctxMiraPermanente.moveTo(centerX + miraConfig.gap - miraConfig.outline, centerY);
		ctxMiraPermanente.lineTo(centerX + miraConfig.gap + miraConfig.tamanho + miraConfig.outline, centerY);
		ctxMiraPermanente.stroke();
		
		// Dot com contorno
		if(miraConfig.dot){
			ctxMiraPermanente.fillStyle = outlineRGBA;
			ctxMiraPermanente.beginPath();
			ctxMiraPermanente.arc(centerX, centerY, (miraConfig.espessura / 2) + miraConfig.outline + 1, 0, Math.PI * 2);
			ctxMiraPermanente.fill();
		}
	}
	
	// Desenhar mira principal
	ctxMiraPermanente.strokeStyle = corRGBA;
	ctxMiraPermanente.lineWidth = miraConfig.espessura;
	
	// Linha superior
	ctxMiraPermanente.beginPath();
	ctxMiraPermanente.moveTo(centerX, centerY - miraConfig.gap - miraConfig.tamanho);
	ctxMiraPermanente.lineTo(centerX, centerY - miraConfig.gap);
	ctxMiraPermanente.stroke();
	
	// Linha inferior
	ctxMiraPermanente.beginPath();
	ctxMiraPermanente.moveTo(centerX, centerY + miraConfig.gap);
	ctxMiraPermanente.lineTo(centerX, centerY + miraConfig.gap + miraConfig.tamanho);
	ctxMiraPermanente.stroke();
	
	// Linha esquerda
	ctxMiraPermanente.beginPath();
	ctxMiraPermanente.moveTo(centerX - miraConfig.gap - miraConfig.tamanho, centerY);
	ctxMiraPermanente.lineTo(centerX - miraConfig.gap, centerY);
	ctxMiraPermanente.stroke();
	
	// Linha direita
	ctxMiraPermanente.beginPath();
	ctxMiraPermanente.moveTo(centerX + miraConfig.gap, centerY);
	ctxMiraPermanente.lineTo(centerX + miraConfig.gap + miraConfig.tamanho, centerY);
	ctxMiraPermanente.stroke();
	
	// Dot central
	if(miraConfig.dot){
		ctxMiraPermanente.fillStyle = corRGBA;
		ctxMiraPermanente.beginPath();
		ctxMiraPermanente.arc(centerX, centerY, miraConfig.espessura / 2, 0, Math.PI * 2);
		ctxMiraPermanente.fill();
	}
}

InicializarMiraPermanente = function(){
	if(canvasMiraPermanente && ctxMiraPermanente){
		AtualizarEstadoMira();
		if(miraConfig.ativo){
			DesenharMiraPermanente();
		}
	}
}

ResetarMira = function(){
	miraConfig = {
		ativo: false,
		tamanho: 12,
		gap: 4,
		espessura: 2,
		outline: 1,
		cor: "#FFFFFF",
		opacidade: 100,
		dot: false
	};
	
	$("#mira-tamanho").val(miraConfig.tamanho);
	$("#mira-tamanho-valor").val(miraConfig.tamanho);
	$("#mira-gap").val(miraConfig.gap);
	$("#mira-gap-valor").val(miraConfig.gap);
	$("#mira-espessura").val(miraConfig.espessura);
	$("#mira-espessura-valor").val(miraConfig.espessura);
	$("#mira-outline").val(miraConfig.outline);
	$("#mira-outline-valor").val(miraConfig.outline);
	$("#mira-cor").val(miraConfig.cor);
	$("#mira-cor-hex").val(miraConfig.cor);
	$("#mira-opacidade").val(miraConfig.opacidade);
	$("#mira-opacidade-valor").val(miraConfig.opacidade);
	$("#mira-dot").prop("checked", miraConfig.dot);
	$("#mira-ativo").prop("checked", miraConfig.ativo);
	
	AtualizarEstadoMira();
	if(ctxMiraPermanente && canvasMiraPermanente){
		ctxMiraPermanente.clearRect(0, 0, canvasMiraPermanente.width, canvasMiraPermanente.height);
	}
	DesenharMira();
}

SalvarMira = function(){
	AtualizarEstadoMira()
	$.post("https://mri_esc/salvarMira", JSON.stringify(miraConfig), function(data){
		DesenharMiraPermanente();
	});
}

consultComandos = function(){
    $.post("https://mri_esc/consultComandos",JSON.stringify({}),(data) => {
		let tabelaComandos = data.tabela || []
		$('#overflow-comandos').empty()
		tabelaComandos.forEach((item) => {
			$('#overflow-comandos').append(`
				<div class="item-comando">
					<div class="item-comando-texto">/${item.comando}</div>
					<div class="botao-executar-comando" onclick="ExecutarComando('${item.comando}')">EXECUTAR</div>
				</div>
			`)
		});
    });
}

ExecutarComando = function(comando){
	$.post("https://mri_esc/executarComando", JSON.stringify({comando: comando}), function(data){
		if(data.success){
			Fechar()
		}
	});
}

consultRedesSociais = function(){
	$.post("https://mri_esc/consultRedesSociais", {}, function(data){
		if(data.success){
			$("#input-instagram").val(data.instagram || "");
			$("#input-tiktok").val(data.tiktok || "");
		}
	});
}

SalvarRedesSociais = function(){
	let instagram = $("#input-instagram").val().trim();
	let tiktok = $("#input-tiktok").val().trim();
	
	$.post("https://mri_esc/salvarRedesSociais", JSON.stringify({
		instagram: instagram,
		tiktok: tiktok
	}), function(data){
		if(data.success){
			console.log("Redes sociais salvas com sucesso!");
		}
	});
}



formatMoney = function(n) {
	if (n === undefined || n === null) return "$ 0";
	return "$ " + n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}
