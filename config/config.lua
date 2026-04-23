Config = {}

--------------------------------------------------------------------------------
-- Atalhos exibidos no menu "Comandos"
--------------------------------------------------------------------------------

Config.Comandos = {
    [1] = { comando = "e dancar5", descricao = "Dança 5" },
    [2] = { comando = "e dancar6", descricao = "Dança 6" },
    [3] = { comando = "e dancar7", descricao = "Dança 7" },
    [4] = { comando = "e dancar8", descricao = "Dança 8" },
    [5] = { comando = "hud", descricao = "Alternar HUD/Interface" }
}

--------------------------------------------------------------------------------
-- Abas do menu (Sistema de Addons)
-- Estrutura para injeção de novas abas:
-- { id: 'identificador', label: 'TEXTO DO BOTÃO', icon: 'fa-icon', action: 'ação' }
-- Actions disponíveis: 'inicio', 'mapa', 'customizacao', 'config', 'comandos', 'mira', ou id de aba customizada
--
-- Exemplo de como adicionar novas abas via outro script:
-- exports.mri_esc:AddTab({ id: 'minha_aba', label: 'MINHA ABA', icon: 'fa-star', action: 'minha_aba' })
--------------------------------------------------------------------------------

Config.Tabs = {
    -- Abas padrão (não remover)
    -- { id = 'inicio', label = 'INÍCIO', icon = 'fa-bars', action = 'inicio' },
    -- { id = 'mapa', label = 'MAPA', icon = 'fa-map', action = 'mapa' },
    -- { id = 'customizacao', label = 'CUSTOMIZAÇÃO', icon = 'fa-user', action = 'customizacao' },
    -- { id = 'config', label = 'CONFIGURAÇÕES', icon = 'fa-cog', action = 'config' }
    { id = 'vip', label = 'VIP', icon = 'fa-crown', action = 'vip' }
}

--------------------------------------------------------------------------------
-- Configurações da Mira
--------------------------------------------------------------------------------

Config.Mira = {
    ativo = false,
    tamanho = 12,
    gap = 4,
    espessura = 2,
    outline = 1,
    cor = "#FFFFFF",
    opacidade = 100,
    dot = false
}

--------------------------------------------------------------------------------
-- Configurações Gerais
--------------------------------------------------------------------------------

Config.AllowSupport = true
Config.AllowCommands = true

--------------------------------------------------------------------------------
-- Admins do Painel VIP (identificadores do jogador)
-- Adicione seus identificadores para garantir acesso ao painel admin
-- Exemplo: "license:abc123", "steam:110000112345678", "fivem:123456"
-- Para descobrir seus identificadores, abra o menu e veja o console do servidor
--------------------------------------------------------------------------------

Config.AdminIds = {
    -- "license:SEU_LICENSE_AQUI",
    -- "steam:SEU_STEAM_AQUI",
    -- "fivem:SEU_FIVEM_AQUI",
}

return Config