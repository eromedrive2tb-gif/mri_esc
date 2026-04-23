
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

	FecharPopupPeluciasLocal()
	$(".containerOpcoes").hide();
	$(".container-pelucias").hide();
	$(".container-caixas").hide();
	$(".container-customizacao").hide();
	$(".container-mira").hide();
	$(".container-battlepass").hide();
	$(".container-recompensas").hide();
	$(".container-comandos").hide();
	$(".botao-header").removeClass("active");
	$(".container-caixas").hide();
	$(".container-caixa-selecionada").hide();

	$("#container-mercado-pelucias").hide();
	$("#mercado-pelucias-anuncios").hide();
	$("#overflow-mercado-pelucias").empty();
	$("#overflow-mercado-pelucias-inventario").empty();

	if (container == "caixas"){
		consultarCaixas()
		$(".container-caixas").show();
	} else if (container == "inicio"){
		$(".botao-header[onclick*=\"TrocarContainer('inicio')\"]").addClass("active");
		$(".containerOpcoes").show();
	} else if (container == "customizacao"){
		consultRedesSociais()
		$(".botao-header[onclick*=\"TrocarContainer('customizacao')\"]").addClass("active");
		$(".container-customizacao").show();
	} else if (container == "pelucias"){
		consultPelucias()
		$(".container-pelucias").show();
	} else if (container == "mira"){
		$.post("https://mri_esc/consultMira", function(data){
			miraConfig = data.tabela;
		});
		$(".container-mira").show();
		InicializarMira();
	} else if (container == "battlepass"){
		consultBattlePass()
		$(".container-battlepass").show();
	} else if (container == "recompensas"){
		consultRecompensas()
		$(".container-recompensas").show();
	} else if (container == "comandos"){
		consultComandos()
		$(".container-comandos").show();
	}
}

Wait = function(time){
	return new Promise(resolve => setTimeout(resolve, time));
}

let caixasData = {}
let itensCaixas = {}

consultarCaixas = function(){
	$.post("https://mri_esc/consultarCaixas", JSON.stringify({}), function(data){
		let tabelaCaixas = data.tabela || []
		caixasData = {}
		itensCaixas = {}
		
		tabelaCaixas.forEach(function(caixa){
			caixasData[caixa.index] = {
				nome: caixa.nome,
				imagem: caixa.imagem,
				preco: caixa.preco
			}
			itensCaixas[caixa.index] = caixa.itens || []
		});
		
		AtualizarListaCaixas()
	});
}

AtualizarListaCaixas = function(){
	let container = $(".overflow-caixas")
	container.html("")
	
	for(let caixaId in caixasData){
		let caixa = caixasData[caixaId]
		let html = `
			<div class="item-caixa" data-caixa-id="${caixaId}">
				<div class="imagem-item-caixa">
					<img src="${caixa.imagem}" alt="">
				</div>
				<div class="info-item-caixa">
					<div class="nome-item-caixa">${caixa.nome}</div>
					<div class="preco-item-caixa">
						<i class="fa-solid fa-gem"></i>
						<span>${caixa.preco}</span>
					</div>
					<div class="botao-item-caixa" onclick="SelecionarCaixa(${caixaId})">
						<i class="fa-solid fa-box-open"></i>
						ABRIR
					</div>
				</div>
			</div>
		`
		container.append(html)
	}
}

let caixaSelecionadaId = null;

SelecionarCaixa = function(caixaId){
	if(caixaSelecionadaId === caixaId) return;
	
	caixaSelecionadaId = caixaId;
	let caixa = caixasData[caixaId] || caixasData[1];
	let itens = itensCaixas[caixaId] || itensCaixas[1];
	
	$("#container-caixas").fadeOut(300);
	
	setTimeout(function(){
		$("#imagem-caixa-selecionada").attr("src", caixa.imagem);
		$("#nome-caixa-selecionada").text(caixa.nome);
		$("#container-caixa-selecionada").fadeIn(300);
		$("#caixa-centro-selecionada").show().css({
			"opacity": "1",
			"transform": "translateY(0)"
		});
		$("#roleta-container-selecionada").hide();
		$("#itens-possiveis-caixa-selecionada").show();
		$("#botao-abrir-caixa-apos-roleta").hide();
		$("#premio-roleta-selecionada").hide();
		MostrarItensPossiveisSelecionada(caixaId);
		
		$("#botao-abrir-caixa-selecionada").off("click").on("click", function(){
			AbrirCaixa(caixaId);
		}).show();
	}, 300);
}

VoltarCaixas = function(){
	$("#container-caixa-selecionada").fadeOut(300);
	setTimeout(function(){
		$("#container-caixas").fadeIn(300);
		$("#caixa-centro-selecionada").show().css({
			"opacity": "1",
			"transform": "translateY(0)"
		});
		$("#roleta-container-selecionada").hide();
		$("#itens-possiveis-caixa-selecionada").show();
		$("#premio-roleta-selecionada").hide();
		caixaSelecionadaId = null;
	}, 300);
}

AbrirCaixa = function(caixaId){
	if(!caixaId) return;
	
	$("#botao-abrir-caixa-selecionada").off("click").prop("disabled", true);
	
	$.post("https://mri_esc/abrirCaixa", JSON.stringify({caixaId: caixaId}), function(data){
		if(data.success){
			let itens = itensCaixas[caixaId] || itensCaixas[1];
			let caixa = caixasData[caixaId] || caixasData[1];
			
			$("#caixa-centro-selecionada").css({
				"opacity": "0",
				"transform": "translateY(-100px)"
			});
			
			setTimeout(function(){
				$("#caixa-centro-selecionada").hide();
				$("#roleta-container-selecionada").fadeIn(300);
				$("#premio-roleta-selecionada").hide();
				$("#botao-abrir-caixa-selecionada").hide();
				$("#botao-abrir-caixa-apos-roleta").hide();
				IniciarRoletaSelecionada(itens, data.item);
			}, 500);
		} else {
			$("#botao-abrir-caixa-selecionada").prop("disabled", false);
		}
	});
}

MostrarItensPossiveisSelecionada = function(caixaId){
	let itens = itensCaixas[caixaId] || itensCaixas[1];
	let container = $("#container-itens-possiveis-selecionada");
	container.html("");
	
	itens.forEach(function(item){
		let imagemUrl = ""
		if(item.tipo == "item"){
			imagemUrl = `http://mauiimagens.shop/imagens/itens/${item.item}.png`
		} else if(item.tipo == "carro"){
			imagemUrl = `http://mauiimagens.shop/imagens/cars/${item.item}.png`
		} else if(item.tipo == "pelucias"){
			imagemUrl = item.imagem
		}
		
		
		let itemHtml = `
			<div class="item-possivel-caixa-selecionada">
				<div class="box-raridade-item-possivel-caixa-selecionada" style="background: linear-gradient(180deg, ${item.cor}80, ${item.cor}60); border: 2px solid ${item.cor}; box-shadow: 0 0 20px ${item.cor};">
					${item.raridade.toUpperCase()}
				</div>
				<div class="imagem-item-possivel-caixa-selecionada">
					<img src="${imagemUrl}" alt="${item.nome}" onerror="this.src='assets/imagem-invalida-user.png'">
				</div>
				<div class="nome-item-possivel-caixa-selecionada">${item.nome}</div>
			</div>
		`;
		container.append(itemHtml);
	});
}

IniciarRoletaSelecionada = function(itens, itemPremio){
	let roletaItems = $("#roleta-items-selecionada");
	roletaItems.css("transition", "none");
	roletaItems.css("transform", "translateX(0)");
	$("#premio-roleta-selecionada").hide();
	$("#botao-abrir-caixa-selecionada").hide();
	

	let premio = itemPremio || itens[Math.floor(Math.random() * itens.length)];
	let premioIndexAleatorio = Math.floor(Math.random() * 10) + 50;
	
	console.log("Prêmio selecionado:", premio.nome, "| Índice:", premioIndexAleatorio);
	
	let itemsHtml = "";
	let itemsArray = [];
	
	// Gera 50 itens aleatórios
	for(let i = 0; i < 50; i++){
		let item = itens[Math.floor(Math.random() * itens.length)];
		if(!item || !item.tipo) continue;
		
		itemsArray.push(item);
		
		let imagemUrl = ""
		if(item.tipo == "item"){
			imagemUrl = `http://mauiimagens.shop/imagens/itens/${item.item}.png`
		} else if(item.tipo == "carro"){
			imagemUrl = `http://mauiimagens.shop/imagens/cars/${item.item}.png`
		} else if(item.tipo == "pelucias"){
			imagemUrl = item.imagem || "assets/imagem-invalida-user.png"
		}
		
		let itemCor = item.cor || "#B0C3D9"
		let itemRaridade = item.raridade || "Comum"
		let itemNome = item.nome || item.item || "Item Desconhecido"
		
		itemsHtml += `
			<div class="roleta-item-selecionada" data-item-index="${i}">
				<div class="box-raridade-roleta-item-selecionada" style="background: linear-gradient(180deg, ${itemCor}80, ${itemCor}60); border: 2px solid ${itemCor}; box-shadow: 0 0 20px ${itemCor};">
					${itemRaridade.toUpperCase()}
				</div>
				<div class="imagem-roleta-item-selecionada">
					<img src="${imagemUrl}" alt="${itemNome}" onerror="this.src='assets/imagem-invalida-user.png'">
				</div>
				<div class="nome-roleta-item-selecionada">${itemNome}</div>
			</div>
		`;
	}
	
	// Adiciona 10 cópias do prêmio selecionado (índices 50-59)
	if(!premio || !premio.tipo) {
		console.error("Prêmio inválido:", premio);
		return;
	}
	
	for(let i = 0; i < 10; i++){
		itemsArray.push(premio);
		
		let imagemUrlPremio = ""
		if(premio.tipo == "item"){
			imagemUrlPremio = `http://mauiimagens.shop/imagens/itens/${premio.item}.png`
		} else if(premio.tipo == "carro"){
			imagemUrlPremio = `http://mauiimagens.shop/imagens/cars/${premio.item}.png`
		} else if(premio.tipo == "pelucias"){
			imagemUrlPremio = premio.imagem || "assets/imagem-invalida-user.png"
		}
		
		let premioCor = premio.cor || "#B0C3D9"
		let premioRaridade = premio.raridade || "Comum"
		let premioNome = premio.nome || premio.item || "Item Desconhecido"
		
		itemsHtml += `
			<div class="roleta-item-selecionada" data-item-index="${50 + i}" data-premio="true">
				<div class="box-raridade-roleta-item-selecionada" style="background: linear-gradient(180deg, ${premioCor}80, ${premioCor}60); border: 2px solid ${premioCor}; box-shadow: 0 0 20px ${premioCor};">
					${premioRaridade.toUpperCase()}
				</div>
				<div class="imagem-roleta-item-selecionada">
					<img src="${imagemUrlPremio}" alt="${premioNome}" onerror="this.src='assets/imagem-invalida-user.png'">
				</div>
				<div class="nome-roleta-item-selecionada">${premioNome}</div>
			</div>
		`;
	}
	
	roletaItems.html(itemsHtml);
	
	// Usa uma IIFE para capturar o premio e premioIndex corretamente
	(function(premioCapturado, premioIndexCapturado){
		setTimeout(function(){
			let premioIndex = premioIndexCapturado;
			
			let roletaContainer = $("#roleta-container-selecionada");
			let containerWidth = roletaContainer.width();
			
			if(containerWidth === 0){
				setTimeout(function(){
					IniciarRoletaSelecionada(itens, itemPremio);
				}, 100);
				return;
			}
			
			let itemElements = roletaItems.find(".roleta-item-selecionada");
			if(itemElements.length === 0 || premioIndex >= itemElements.length){
				console.error("Erro: Índice do prêmio inválido ou elementos não encontrados");
				return;
			}
			
			let premioElement = itemElements.eq(premioIndex);
			let premioRect = premioElement[0].getBoundingClientRect();
			let containerRect = roletaContainer[0].getBoundingClientRect();
			
			let centerContainer = containerRect.left + (containerWidth / 2);
			let premioCenter = premioRect.left + (premioRect.width / 2);
			
			let currentTransform = roletaItems.css("transform");
			let currentTranslateX = 0;
			if(currentTransform && currentTransform !== "none"){
				let matrixMatch = currentTransform.match(/matrix\(([^)]+)\)/);
				if(matrixMatch && matrixMatch[1]){
					let values = matrixMatch[1].split(",");
					if(values.length >= 5){
						currentTranslateX = parseFloat(values[4].trim()) || 0;
					}
				}
			}
			
			let finalTranslateX = currentTranslateX + (centerContainer - premioCenter);
			
			console.log("Animando para índice:", premioIndex, "| Item:", itemsArray[premioIndex].nome, "| TranslateX:", finalTranslateX);
			
			roletaItems.css("transition", "transform 3s cubic-bezier(0.17, 0.67, 0.12, 0.99)");
			roletaItems.css("transform", `translateX(${finalTranslateX}px)`);
			
			setTimeout(function(){
				let roletaContainerFinal = $("#roleta-container-selecionada");
				let containerWidthFinal = roletaContainerFinal.width();
				let containerRectFinal = roletaContainerFinal[0].getBoundingClientRect();
				let centerContainerFinal = containerRectFinal.left + (containerWidthFinal / 2);
				
				let itemNoCentroFinal = null;
				let menorDistanciaFinal = Infinity;
				
				itemElements.each(function(index){
					let itemRect = this.getBoundingClientRect();
					let itemCenter = itemRect.left + (itemRect.width / 2);
					let distancia = Math.abs(centerContainerFinal - itemCenter);
					
					if(distancia < menorDistanciaFinal){
						menorDistanciaFinal = distancia;
						itemNoCentroFinal = index;
					}
				});
				
				if(itemNoCentroFinal !== premioIndex){
					let premioElementFinal = itemElements.eq(premioIndex);
					let premioRectFinal = premioElementFinal[0].getBoundingClientRect();
					let premioCenterFinal = premioRectFinal.left + (premioRectFinal.width / 2);
					
					let currentTransformFinal = roletaItems.css("transform");
					let currentTranslateXFinal = 0;
					if(currentTransformFinal && currentTransformFinal !== "none"){
						let matrixMatchFinal = currentTransformFinal.match(/matrix\(([^)]+)\)/);
						if(matrixMatchFinal && matrixMatchFinal[1]){
							let valuesFinal = matrixMatchFinal[1].split(",");
							if(valuesFinal.length >= 5){
								currentTranslateXFinal = parseFloat(valuesFinal[4].trim()) || 0;
							}
						}
					}
					
					let ajusteFinal = centerContainerFinal - premioCenterFinal;
					let adjustedTranslateXFinal = currentTranslateXFinal + ajusteFinal;
					
					roletaItems.css("transition", "transform 0.3s ease-out");
					roletaItems.css("transform", `translateX(${adjustedTranslateXFinal}px)`);
					
					setTimeout(function(){
						console.log("Item ganho (final):", premioCapturado.nome, "| Raridade:", premioCapturado.raridade.toUpperCase());
						
						$("#premio-nome-roleta-selecionada").text(premioCapturado.nome);
						$("#premio-raridade-roleta-selecionada").text(premioCapturado.raridade.toUpperCase()).css({
							"color": "#fff",
							"background": `linear-gradient(180deg, ${premioCapturado.cor}80, ${premioCapturado.cor}60)`,
							"border": `2px solid ${premioCapturado.cor}`,
							"box-shadow": `0 0 20px ${premioCapturado.cor}`
						});
						$("#premio-roleta-selecionada").fadeIn(300);
						
						$.post("https://mri_esc/coletarItemCaixa", JSON.stringify({}), function(data){
							if(data.success){
								console.log("Item coletado com sucesso!");
							} else {
								console.warn("Erro ao coletar item:", data.message);
							}
						});
						
						$("#botao-abrir-caixa-apos-roleta").fadeIn(300);
						$("#botao-abrir-caixa-apos-roleta").off("click").on("click", function(){
							if(caixaSelecionadaId && !$(this).prop("disabled")){
								$(this).prop("disabled", true);
								AbrirCaixa(caixaSelecionadaId);
								setTimeout(() => $(this).prop("disabled", false), 2000);
							}
						});
						
						$("#botao-abrir-novamente-caixa-selecionada").off("click").on("click", function(){
							if(caixaSelecionadaId && !$(this).prop("disabled")){
								$(this).prop("disabled", true);
								AbrirCaixa(caixaSelecionadaId);
								setTimeout(() => $(this).prop("disabled", false), 2000);
							}
						});
					}, 300);
				} else {
					console.log("Item ganho (final):", premioCapturado.nome, "| Raridade:", premioCapturado.raridade.toUpperCase());
					
					$("#premio-nome-roleta-selecionada").text(premioCapturado.nome);
					$("#premio-raridade-roleta-selecionada").text(premioCapturado.raridade.toUpperCase()).css({
						"color": "#fff",
						"background": `linear-gradient(180deg, ${premioCapturado.cor}80, ${premioCapturado.cor}60)`,
						"border": `2px solid ${premioCapturado.cor}`,
						"box-shadow": `0 0 20px ${premioCapturado.cor}`
					});
					$("#premio-roleta-selecionada").fadeIn(300);
					
					$.post("https://mri_esc/coletarItemCaixa", JSON.stringify({}), function(data){
						if(data.success){
							console.log("Item coletado com sucesso!");
						} else {
							console.warn("Erro ao coletar item:", data.message);
						}
					});
					
					$("#botao-abrir-caixa-apos-roleta").fadeIn(300);
					$("#botao-abrir-caixa-apos-roleta").off("click").on("click", function(){
						if(caixaSelecionadaId && !$(this).prop("disabled")){
							$(this).prop("disabled", true);
							AbrirCaixa(caixaSelecionadaId);
							setTimeout(() => $(this).prop("disabled", false), 2000);
						}
					});
					
					$("#botao-abrir-novamente-caixa-selecionada").off("click").on("click", function(){
						if(caixaSelecionadaId && !$(this).prop("disabled")){
							$(this).prop("disabled", true);
							AbrirCaixa(caixaSelecionadaId);
							setTimeout(() => $(this).prop("disabled", false), 2000);
						}
					});
				}
			}, 3000);
		}, 100);
	})(premio, premioIndexAleatorio);
}

$(document).ready(function(){
	$(".overlay-modal-roleta").click(function(){
		FecharRoleta();
	});
	
	$(".item-caixa").each(function(index){
		let botao = $(this).find(".botao-item-caixa");
		let caixaId = $(this).attr("data-caixa-id") || (index + 1);
		if(!botao.attr("onclick")){
			botao.attr("onclick", `SelecionarCaixa(${caixaId})`);
			$(this).attr("data-caixa-id", caixaId);
		}
	});
});

FecharRoleta = function(){
	$("#modal-roleta").fadeOut(300);
	$("#premio-roleta").hide();
}

FecharPopupPeluciasLocal = function(){
	$(".popup").hide();
	$(".popup-pelucias-local").hide();
}


function consultPelucias(){
    $.post("https://mri_esc/consultPelucias",JSON.stringify({}),(data) => {
		let tabelaList = data.tabela.sort((a,b) => (a.liberado > b.liberado) ? 1: -1);
		$('.overflow-pelucias').empty()
		tabelaList.forEach((item) => {

		let liberado = item.liberado ? "liberado" : "bloqueado";
		let textoBotao = item.liberado ? "EQUIPAR" : "INDISPONIVEL";

		$('.overflow-pelucias').prepend(`
			<div class="item-pelucia" data-pelucia-index="${item.index}">
				<img src="${item.imagem}" alt="">
				<div class="nome-item-pelucia">${item.nome}</div>
				<div class="botao-equipar-pelucia ${liberado}" onclick="AbrirPopupPeluciasLocal(this)" data-index="${item.index}" data-tabela-coordenadas='${JSON.stringify(item.coordenadas)}'>${textoBotao}</div>
				<div class="tooltip-pelucia">
					<div class="tooltip-pelucia-content">
						<div class="tooltip-pelucia-item">
							<i class="fa-solid fa-city"></i>
							<span>Na cidade: <b>${item.quantidadeCidade || 0}</b></span>
						</div>
						<div class="tooltip-pelucia-item">
							<i class="fa-solid fa-user"></i>
							<span>Você possui: <b>${item.quantidadeJogador || 0}</b></span>
						</div>
					</div>
				</div>
			</div>
		`)
		});
    });
}

AbrirPopupPeluciasLocal = function(data){
	$(".popup-pelucias-local").show();
	$(".overflow-popup-pelucias-local").empty();
	$(".popup").fadeIn(500);
	let index = data.dataset.index;
	let tabelaCoordenadasJson = data.dataset.tabelaCoordenadas;
	
	let coordenadasObj = JSON.parse(tabelaCoordenadasJson);
	let tabelaCoordenadas = Object.keys(coordenadasObj).map(function(key) {
		let nomeFormatado = key.replace(/([A-Z])/g, ' $1').trim();
		return {
			index: key,
			nome: nomeFormatado
		};
	});
	
	tabelaCoordenadas.forEach(function(coordenada){
		$(".overflow-popup-pelucias-local").append(`
			<div class="item-popup-pelucias-local" onclick="EscolherCoordenada('${index}','${coordenada.index}')">${coordenada.nome}</div>
		`);
	});

}

EscolherCoordenada = function(peluciaIndex,coordenadaIndex){
	FecharPopupPeluciasLocal()
	$.post("https://mri_esc/escolherCoordenada",JSON.stringify({
		peluciaIndex: peluciaIndex,
		coordenadaIndex: coordenadaIndex
	}),function(data){
		console.log(data);
	});
}

LimparPelucias = function(){
	$.post("https://mri_esc/limparPelucias",JSON.stringify({}),function(data){});
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

let battlePassConfig = {}
let battlePassData = {}
let battlePassPaginaAtual = 1
let itensPorPagina = 7
let battlePassCooldownTimer = null
let battlePassTempoRestante = 0

consultBattlePass = function(){
	$.post("https://mri_esc/consultBattlePass", {}, function(data){
		battlePassConfig = data.config || {}
		battlePassData = data.data || {}
		battlePassData.recompensaAtual = data.data.recompensaAtual || 0
		battlePassTempoRestante = data.data.tempo_restante || 0
		IniciarTimerCooldown()
		AtualizarBattlePass()
	});
}

IniciarTimerCooldown = function(){
	if(battlePassCooldownTimer){
		clearInterval(battlePassCooldownTimer)
		battlePassCooldownTimer = null
	}
	
	if(battlePassTempoRestante > 0){
		$("#battlepass-cooldown-container").show()
		AtualizarTimerCooldown()
		
		battlePassCooldownTimer = setInterval(function(){
			battlePassTempoRestante--
			if(battlePassTempoRestante <= 0){
				battlePassTempoRestante = 0
				$("#battlepass-cooldown-container").hide()
				clearInterval(battlePassCooldownTimer)
				battlePassCooldownTimer = null
				AtualizarBattlePass()
			} else {
				AtualizarTimerCooldown()
			}
		}, 1000)
	} else {
		$("#battlepass-cooldown-container").hide()
	}
}

AtualizarTimerCooldown = function(){
	let horas = Math.floor(battlePassTempoRestante / 3600)
	let minutos = Math.floor((battlePassTempoRestante % 3600) / 60)
	let segundos = battlePassTempoRestante % 60
	
	let horasStr = horas.toString().padStart(2, '0')
	let minutosStr = minutos.toString().padStart(2, '0')
	let segundosStr = segundos.toString().padStart(2, '0')
	
	$("#battlepass-cooldown-timer").text(`${horasStr}:${minutosStr}:${segundosStr}`)
}

AtualizarBattlePass = function(){
	let container = $("#battlepass-itens-container")
	container.html("")
	
	let totalItens = 0
	for(let key in battlePassConfig){
		if(battlePassConfig[key]){
			let idNum = parseInt(key)
			if(!isNaN(idNum) && idNum > totalItens){
				totalItens = idNum
			}
		}
	}
	let totalPaginas = Math.ceil(totalItens / itensPorPagina)
	
	$("#battlepass-total-paginas").text(totalPaginas)
	$("#battlepass-pagina-atual").text(battlePassPaginaAtual)
	
	if(battlePassData.comprado){
		$("#battlepass-comprar-container").hide()
	} else {
		$("#battlepass-comprar-container").show()
	}
	
	for(let pagina = 0; pagina < totalPaginas; pagina++){
		let paginaHtml = $("<div class='battlepass-pagina-items'></div>")
		
		for(let i = 0; i < itensPorPagina; i++){
			let itemId = (pagina * itensPorPagina) + i + 1
			if(itemId > totalItens) break
			
			let item = battlePassConfig[itemId] || battlePassConfig[itemId.toString()] || battlePassConfig[parseInt(itemId)]
			if(!item) {
				continue
			}
			
			let recompensaAtual = battlePassData.recompensaAtual || 0
			let coletado = itemId <= recompensaAtual
			let temCooldown = battlePassTempoRestante > 0
			let podeColetar = battlePassData.comprado && battlePassTempoRestante <= 0 && itemId == recompensaAtual + 1 && !coletado || false
			
			let imagemUrl = ""
			if(item.tipo == "item"){
				imagemUrl = `http://mauiimagens.shop/imagens/itens/${item.item}.png`
			} else if(item.tipo == "carro"){
				imagemUrl = `http://mauiimagens.shop/imagens/cars/${item.item}.png`
			}
			
			let quantidade = item.amount || 1
			let quantidadeTexto = item.tipo == "item" ? quantidade : "-"
			
			let html = `
				<div class="battlepass-item">
					<div class="battlepass-item-header">
						<div class="battlepass-item-nivel">NÍVEL ${itemId}</div>
						<div class="battlepass-item-quantidade">${quantidadeTexto}</div>
					</div>
					<div class="battlepass-item-imagem">
						<img src="${imagemUrl}" alt="${item.item}" onerror="this.src='assets/imagem-invalida-user.png'">
					</div>
				<div class="battlepass-item-nome">${item.item || 'Item'}</div>
				<div class="battlepass-item-botao ${coletado ? 'coletado' : podeColetar && !temCooldown ? 'desbloqueado' : ''}" onclick="ColetarItemBattlePass(${itemId})" ${coletado || !podeColetar || temCooldown ? 'style="cursor: not-allowed;"' : ''}>
					${coletado ? 'COLETADO' : temCooldown ? 'AGUARDANDO' : podeColetar ? 'COLETAR' : 'BLOQUEADO'}
				</div>
				</div>
			`
			paginaHtml.append(html)
		}
		
		container.append(paginaHtml)
	}
	
	let translateX = -(battlePassPaginaAtual - 1) * 100
	container.css("transform", `translateX(${translateX}%)`)
	
	if(battlePassPaginaAtual <= 1){
		$(".battlepass-pagina-anterior").css("opacity", "0.5").css("cursor", "not-allowed")
	} else {
		$(".battlepass-pagina-anterior").css("opacity", "1").css("cursor", "pointer")
	}
	
	if(battlePassPaginaAtual >= totalPaginas){
		$(".battlepass-pagina-proximo").css("opacity", "0.5").css("cursor", "not-allowed")
	} else {
		$(".battlepass-pagina-proximo").css("opacity", "1").css("cursor", "pointer")
	}
}

TrocarPaginaBattlePass = function(direcao){
	let totalItens = 0
	for(let key in battlePassConfig){
		if(battlePassConfig[key]){
			let idNum = parseInt(key)
			if(!isNaN(idNum) && idNum > totalItens){
				totalItens = idNum
			}
		}
	}
	let totalPaginas = Math.ceil(totalItens / itensPorPagina)
	
	if(direcao == "anterior" && battlePassPaginaAtual > 1){
		battlePassPaginaAtual--
		let container = $("#battlepass-itens-container")
		let translateX = -(battlePassPaginaAtual - 1) * 100
		container.css("transform", `translateX(${translateX}%)`)
		$("#battlepass-pagina-atual").text(battlePassPaginaAtual)
		
		if(battlePassPaginaAtual <= 1){
			$(".battlepass-pagina-anterior").css("opacity", "0.5").css("cursor", "not-allowed")
		} else {
			$(".battlepass-pagina-anterior").css("opacity", "1").css("cursor", "pointer")
		}
		$(".battlepass-pagina-proximo").css("opacity", "1").css("cursor", "pointer")
	} else if(direcao == "proximo" && battlePassPaginaAtual < totalPaginas){
		battlePassPaginaAtual++
		let container = $("#battlepass-itens-container")
		let translateX = -(battlePassPaginaAtual - 1) * 100
		container.css("transform", `translateX(${translateX}%)`)
		$("#battlepass-pagina-atual").text(battlePassPaginaAtual)
		
		if(battlePassPaginaAtual >= totalPaginas){
			$(".battlepass-pagina-proximo").css("opacity", "0.5").css("cursor", "not-allowed")
		} else {
			$(".battlepass-pagina-proximo").css("opacity", "1").css("cursor", "pointer")
		}
		$(".battlepass-pagina-anterior").css("opacity", "1").css("cursor", "pointer")
	}
}

ColetarItemBattlePass = function(itemId){
	if(!battlePassData.comprado){
		return
	}
	
	let itemIdNum = parseInt(itemId)
	let recompensaAtual = battlePassData.recompensaAtual || 0
	
	if(itemIdNum <= recompensaAtual){
		return
	}
	
	$.post("https://mri_esc/coletarItemBattlePass", JSON.stringify({itemId: itemIdNum}), function(data){
		if(data.success){
			battlePassData.recompensaAtual = itemIdNum
			battlePassTempoRestante = data.tempo_restante || 86400
			IniciarTimerCooldown()
			AtualizarBattlePass()
		} else {
			if(data.tempo_restante){
				battlePassTempoRestante = data.tempo_restante
				IniciarTimerCooldown()
				AtualizarBattlePass()
			}
		}
	});
}

ComprarBattlePass = function(){
	$.post("https://mri_esc/comprarBattlePass", {}, function(data){
		if(data.success){
			battlePassData.comprado = true
			AtualizarBattlePass()
		}
	});
}

let recompensasConfig = {}
let recompensasData = {}

consultRecompensas = function(){
	$.post("https://mri_esc/consultRecompensas", {}, function(data){
		recompensasConfig.loja = data.loja || {}
		recompensasConfig.calendario = data.calendario || {}
		recompensasData = data.data || {}
		recompensasData.pontos = data.data.pontos || 0
		$("#recompensas-pontos-valor").text(recompensasData.pontos)
		AtualizarCalendario()
		AtualizarLoja()
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

AtualizarCalendario = function(){
	let container = $("#recompensas-calendario-container")
	container.html("")
	
	let calendario = recompensasConfig.calendario || {}
	let coletados = recompensasData.calendarioColetados || []
	let tempoRestante = recompensasData.tempo_restante_calendario || 0
	let temCooldown = tempoRestante > 0
	
	if(!Array.isArray(coletados)){
		coletados = []
	}
	
	let diaAtual = 0
	for(let i = 0; i < coletados.length; i++){
		if(coletados[i] && coletados[i] > diaAtual){
			diaAtual = coletados[i]
		}
	}
	
	let proximoDia = diaAtual + 1
	
	let diasOrdenados = []
	for(let diaId in calendario){
		let dia = parseInt(diaId)
		if(!isNaN(dia) && dia >= 1){
			diasOrdenados.push(dia)
		}
	}
	diasOrdenados.sort((a, b) => a - b)
	
	for(let i = 0; i < diasOrdenados.length; i++){
		let dia = diasOrdenados[i]
		let diaId = dia.toString()
		
		let recompensa = calendario[diaId]
		if(!recompensa) continue
		
		let coletado = coletados.indexOf(dia) !== -1 || false
		let podeColetar = !coletado && !temCooldown && dia == proximoDia || false
		
		let imagemUrl = ""
		if(recompensa.tipo == "item"){
			imagemUrl = `http://mauiimagens.shop/imagens/itens/${recompensa.item}.png`
		} else if(recompensa.tipo == "carro"){
			imagemUrl = `http://mauiimagens.shop/imagens/cars/${recompensa.item}.png`
		}
		
		let quantidade = recompensa.amount || 1
		let quantidadeTexto = recompensa.tipo == "item" ? quantidade : "-"
		
		let textoBotao = ""
		if(coletado){
			textoBotao = 'COLETADO'
		} else if(temCooldown && dia == proximoDia){
			textoBotao = 'AGUARDANDO'
		} else if(podeColetar){
			textoBotao = 'COLETAR'
		} else {
			textoBotao = 'BLOQUEADO'
		}
		
		let html = `
			<div class="recompensas-calendario-item">
				<div class="recompensas-calendario-item-dia">DIA ${dia}</div>
				<div class="recompensas-calendario-item-imagem">
					<img src="${imagemUrl}" alt="${recompensa.item}" onerror="this.src='assets/imagem-invalida-user.png'">
				</div>
				<div class="recompensas-calendario-item-nome">${recompensa.item || 'Item'}</div>
				<div class="recompensas-calendario-item-quantidade">${quantidadeTexto}</div>
				<div class="recompensas-calendario-item-botao ${coletado ? 'coletado' : podeColetar ? 'desbloqueado' : ''}" onclick="ColetarCalendario(${dia})" ${coletado || !podeColetar || (temCooldown && dia == proximoDia) ? 'style="cursor: not-allowed;"' : ''}>
					${textoBotao}
				</div>
			</div>
		`
		container.append(html)
	}
}

AtualizarLoja = function(){
	let container = $("#recompensas-loja-container")
	container.html("")
	
	let loja = recompensasConfig.loja || []
	let pontosAtuais = recompensasData.pontos || 0
	
	for(let i = 0; i < loja.length; i++){
		let itemData = loja[i]
		if(!itemData) continue
		
		let itemId = itemData.index
		let item = itemData
		
		let pontosNecessarios = item.pontos || 0
		let podeComprar = pontosAtuais >= pontosNecessarios || false
		
		let imagemUrl = ""
		if(item.tipo == "item"){
			imagemUrl = `http://mauiimagens.shop/imagens/itens/${item.item}.png`
		} else if(item.tipo == "carro"){
			imagemUrl = `http://mauiimagens.shop/imagens/cars/${item.item}.png`
		}
		
		let quantidade = item.amount || 1
		let quantidadeTexto = item.tipo == "item" ? quantidade : "-"
		
		let html = `
			<div class="recompensas-loja-item">
				<div class="recompensas-loja-item-imagem">
					<img src="${imagemUrl}" alt="${item.item}" onerror="this.src='assets/imagem-invalida-user.png'">
				</div>
				<div class="recompensas-loja-item-nome">${item.item || 'Item'}</div>
				<div class="recompensas-loja-item-quantidade">${quantidadeTexto}</div>
				<div class="recompensas-loja-item-preco">
					<i class="fa-solid fa-star"></i>
					<span>${pontosNecessarios}</span>
				</div>
				<div class="recompensas-loja-item-botao ${podeComprar ? 'desbloqueado' : ''}" onclick="ComprarLoja(${itemId})" ${!podeComprar ? 'style="cursor: not-allowed;"' : ''}>
					${podeComprar ? 'COMPRAR' : 'PONTOS INSUFICIENTES'}
				</div>
			</div>
		`
		container.append(html)
	}
}

ColetarCalendario = function(diaId){
	let coletados = recompensasData.calendarioColetados || []
	let diaNum = parseInt(diaId)
	
	if(!Array.isArray(coletados)){
		coletados = []
		recompensasData.calendarioColetados = coletados
	}
	
	if(coletados.indexOf(diaNum) !== -1){
		return
	}
	
	$.post("https://mri_esc/coletarCalendario", JSON.stringify({diaId: diaNum}), function(data){
		if(data.success){
			if(!Array.isArray(recompensasData.calendarioColetados)){
				recompensasData.calendarioColetados = []
			}
			if(recompensasData.calendarioColetados.indexOf(diaNum) === -1){
				recompensasData.calendarioColetados.push(diaNum)
			}
			recompensasData.tempo_restante_calendario = data.tempo_restante || 86400
			AtualizarCalendario()
		} else {
			if(data.tempo_restante){
				recompensasData.tempo_restante_calendario = data.tempo_restante
				AtualizarCalendario()
			}
		}
	});
}

ComprarLoja = function(itemId){
	let itemIdNum = parseInt(itemId)
	if(isNaN(itemIdNum) || itemIdNum <= 0){
		return
	}
	
	$.post("https://mri_esc/comprarLoja", JSON.stringify({itemId: itemIdNum}), function(data){
		if(data.success){
			consultRecompensas()
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



TrocarTabMercadoPelucias = function(tab){
	$(".mercado-pelucias-tab").removeClass("active");
	if(tab == "anuncios"){
		$(".mercado-pelucias-tab").eq(0).addClass("active");
		$("#mercado-pelucias-anuncios").show();
		$("#mercado-pelucias-inventario").hide();
		CarregarAnunciosPelucias();
	} else {
		$(".mercado-pelucias-tab").eq(1).addClass("active");
		$("#mercado-pelucias-anuncios").hide();
		$("#mercado-pelucias-inventario").show();
		CarregarInventarioPelucias();
	}
}

CarregarAnunciosPelucias = function(){
	$.post("https://mri_esc/anunciosListaPelucias", JSON.stringify({}), (data) => {
		$("#overflow-mercado-pelucias").empty();
		if(data.anunciosLista){
			data.anunciosLista.forEach((item) => {
				let botao = "";
				if(item.Owner_Button == "1"){
					botao = `<div class="botao-item-mercado-pelucias botao-pegar" onclick="PegarPelucia(${item.id})"><i class="fa-solid fa-hand-holding"></i> PEGAR</div>`;
				} else {
					botao = `<div class="botao-item-mercado-pelucias botao-comprar" onclick="ComprarPelucia(${item.id})"><i class="fa-solid fa-cart-shopping"></i> COMPRAR</div>`;
				}
				
				$("#overflow-mercado-pelucias").prepend(`
					<div class="item-mercado-pelucias">
						<div class="imagem-mercado-pelucias">
							<img src="${item.imagem}" alt="">
						</div>
						<div class="info-mercado-pelucias-direita">
							<div class="nome-mercado-pelucias-wrapper">
								<div class="nome-mercado-pelucias">${item.nome}</div>
								<div class="quantidade-box-mercado-compacto">
									<span>${item.quantidadeCidade || 0}</span>
								</div>
							</div>
							<div class="vendedor-info-mercado-compacto">
								<span>${item.vendedorNome || "Desconhecido"}</span>
								<span class="vendedor-id-compacto">#${item.vendedorId || 0}</span>
							</div>
							${botao}
						</div>
					</div>
				`);
			});
		}
	});
}

CarregarInventarioPelucias = function(){
	$.post("https://mri_esc/ListaInventoryPelucias", JSON.stringify({}), (data) => {
		$(".overflow-pelucias3").empty();
		if(data.ListaInventory){
			data.ListaInventory.forEach((item) => {
				$("#overflow-mercado-pelucias-inventario").prepend(`
					<div class="item-mercado-pelucias-inventario">
						<img src="${item.imagem}" alt="">
						<div class="nome-item-mercado-pelucias-inventario">${item.nome}</div>
						<div class="quantidade-item-mercado-pelucias-inventario">Você possui: <span style="color: var(--cor-principal); font-weight: 700;">${item.quantidade}</span></div>
						<div class="botao-item-mercado-pelucias-inventario" onclick="AbrirPopupVender('${item.pelucia}', '${item.nome}', '${item.imagem}')"><i class="fa-solid fa-tag"></i> VENDER</div>
					</div>
				`);
			});
		}
	});
}

PegarPelucia = function(id){
	FecharInterface();
	$.post("https://mri_esc/PegarPelucia", JSON.stringify({id: id}), function(data){
		if(data.retorno == 'done'){
			CarregarAnunciosPelucias();
		}
	});
}

ComprarPelucia = function(id){
	FecharInterface();
	$.post("https://mri_esc/ComprarPelucia", JSON.stringify({id: id}), function(data){
		if(data.retorno == 'done'){
			CarregarAnunciosPelucias();
		}
	});
}

let peluciaVenderAtual = null;

AbrirPopupVender = function(pelucia, nome, imagem){
	peluciaVenderAtual = pelucia;
	$("#imagem-popup-vender").attr("src", imagem);
	$("#nome-popup-vender").text(nome);
	$("#preco-popup-vender").val("");
	$("#popup-vender-pelucia").fadeIn(300);
}

FecharPopupVender = function(){
	$("#popup-vender-pelucia").hide();
	peluciaVenderAtual = null;
}

ConfirmarVenderPelucia = function(){
	let preco = $("#preco-popup-vender").val();
	if(!preco || parseInt(preco) < 1){
		return;
	}

	if(peluciaVenderAtual){
		$.post("https://mri_esc/VenderPelucia", JSON.stringify({pelucia: peluciaVenderAtual, preco: parseInt(preco)}), function(data){
			if(data.retorno == 'done'){
				FecharPopupVender();
				TrocarTabMercadoPelucias('anuncios');
				CarregarInventarioPelucias();
			}
		});
	}
}

window.addEventListener('click', function(event) {
	if(event.target.classList.contains('overlay-popup-vender')){
		FecharPopupVender();
	}
});

ReceberDinheiroPelucias = function(){
	$.post("https://mri_esc/ReceberDinheiroPelucias", JSON.stringify({}), function(data){
		if(data.retorno == 'done'){
			AtualizarInfoMercadoPelucias();
		}
	});
}

AtualizarInfoMercadoPelucias = function(){
	$.post("https://mri_esc/ReturnInfosMercadoPelucias", JSON.stringify({}), function(data){
		if(data){
			$("#mercado-pelucias-nome").text(data.nome || "Jogador");
			$("#mercado-pelucias-receber").text(data.receber || "$0");
		}
	});
}

formatarNumero = function(numero){
	return numero.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

AbrirSkins = function(){
	FecharInterface();
	$.post("https://mri_esc/close");
	$.post("https://mri_esc/AbrirSkins", JSON.stringify({}), function(data){
	
	});
}
