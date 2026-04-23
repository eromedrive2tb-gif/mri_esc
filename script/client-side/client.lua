local Config = Config or {}
local open = false
local pauseMenu = false
local miraConfig = { ativo = false }
local redesSociais = { instagram = "", tiktok = "", youtube = "" }

Citizen.CreateThread(function()
    local savedMira = GetResourceKvpString("mri_esc:mira")
    if savedMira then
        local ok, decoded = pcall(json.decode, savedMira)
        if ok and decoded then miraConfig = decoded end
    end

    local savedRedes = GetResourceKvpString("mri_esc:redes")
    if savedRedes then
        local ok, decoded = pcall(json.decode, savedRedes)
        if ok and decoded then redesSociais = decoded end
    end
end)

local function GetPlayerData()
    if GetResourceState('qbx_core') == 'started' then
        return exports.qbx_core:GetPlayerData()
    elseif GetResourceState('qb-core') == 'started' then
        local QBCore = exports['qb-core']:GetCoreObject()
        return QBCore.Functions.GetPlayerData()
    end
    return nil
end

local function GetPlayersOnline()
    if GetResourceState('ox_lib') == 'started' then
        return lib.callback.await('mri_esc:server:getPlayersOnline', false) or 1
    end
    return 1
end

CreateThread(function()
    while true do
        Wait(0)
        DisableControlAction(0, 200, true)
        if miraConfig and miraConfig.ativo then
            HideHudComponentThisFrame(14)
        end
    end
end)

local function BuildTabsConfig()
    local defaultTabs = {
        { id = 'inicio', label = 'INÍCIO', icon = 'fa-bars', action = 'inicio' },
        { id = 'mapa', label = 'MAPA', icon = 'fa-map', action = 'mapa' },
        { id = 'customizacao', label = 'CUSTOMIZAÇÃO', icon = 'fa-user', action = 'customizacao' },
        { id = 'config', label = 'CONFIGURAÇÕES', icon = 'fa-cog', action = 'config' }
    }

    if Config.Tabs then
        for _, tab in ipairs(Config.Tabs) do
            table.insert(defaultTabs, tab)
        end
    end

    return defaultTabs
end

local canOpenMenu = false

Citizen.SetTimeout(2000, function()
    canOpenMenu = true
end)

RegisterCommand("open_menu", function()
    if not canOpenMenu then
        return
    end

    if not LocalPlayer.state.isLoggedIn or LocalPlayer.state.inArena or LocalPlayer.state.isDead or LocalPlayer.state.invOpen then
        return
    end

    if open then
        return
    end

    if not pauseMenu and not IsPauseMenuActive() then
        local playersOn = GetPlayersOnline()
        local playerData = GetPlayerData()
        local vipData = lib.callback.await('mri_esc:server:getVipData', false)
        
        local nome = "Jogador"
        local id = GetPlayerServerId(PlayerId())
        local money = 0
        local bank = 0
        local jobText = "Desempregado"

        if playerData then
            nome = (playerData.charinfo and (playerData.charinfo.firstname .. " " .. playerData.charinfo.lastname)) or nome
            id = playerData.citizenid or id
            if playerData.money then
                money = playerData.money.cash or 0
                bank = playerData.money.bank or 0
            end
            if playerData.job then
                local jName = playerData.job.label or "Desempregado"
                local jGrade = (playerData.job.grade and playerData.job.grade.name) or ""
                jobText = jGrade ~= "" and (jName .. " - " .. jGrade) or jName
            end
        end

        -- isAdmin vem direto do servidor junto com os dados VIP
        local isAdmin = vipData and vipData.isAdmin == true

        SendNUIMessage({
            action    = "showMenu",
            playersOn = playersOn,
            nome      = nome,
            id        = id,
            money     = money,
            bank      = bank,
            job       = jobText,
            vip       = vipData,
            isAdmin   = isAdmin,
            tabs      = BuildTabsConfig()
        })

        Wait(50)
        
        SetNuiFocus(true, true)
        StartScreenEffect("MenuMGSelectionIn", 0, true)
        TriggerEvent("hud:Active", false)
        open = true
    end
end)
RegisterKeyMapping("open_menu", "Abrir Esc Menu", "keyboard", "ESCAPE")

local function closeMenu(ignoreFrontend)
    SendNUIMessage({ action = "hideMenu" })
    StopScreenEffect("MenuMGSelectionIn")
    open = false
    TriggerEvent("hud:Active", true)

    CreateThread(function()
        if not ignoreFrontend then SetFrontendActive(false) end
        Wait(150)
        SetNuiFocus(false, false)
        if not ignoreFrontend then SetFrontendActive(false) end
    end)
end

RegisterNUICallback("close", function(_, cb)
    closeMenu()
    if cb then cb({ success = true }) end
end)

RegisterNUICallback("mapa", function(_, cb)
    closeMenu(true)
    Wait(100)
    ActivateFrontendMenu(GetHashKey("FE_MENU_VERSION_MP_PAUSE"), 0, -1)
    if cb then cb({ success = true }) end
end)

RegisterNUICallback("config", function(_, cb)
    closeMenu(true)
    Wait(100)
    ActivateFrontendMenu(GetHashKey("FE_MENU_VERSION_LANDING_MENU"), 0, -1)
    if cb then cb({ success = true }) end
end)

RegisterNUICallback("consultComandos", function(_, cb)
    if cb then cb({ tabela = Config.Comandos or {} }) end
end)

RegisterNUICallback("executarComando", function(data, cb)
    if data.comando then
        ExecuteCommand(data.comando)
    end
    if cb then cb({ success = true }) end
end)

RegisterNUICallback("consultMira", function(_, cb)
    if cb then cb({ tabela = miraConfig }) end
end)

RegisterNUICallback("salvarMira", function(data, cb)
    miraConfig = data
    SetResourceKvp("mri_esc:mira", json.encode(data))
    SendNUIMessage({ action = "miraData", mira = data })
    if cb then cb({ success = true }) end
end)

RegisterNUICallback("consultRedesSociais", function(_, cb)
    if cb then cb({ success = true, instagram = redesSociais.instagram, tiktok = redesSociais.tiktok, youtube = redesSociais.youtube }) end
end)

RegisterNUICallback("salvarRedesSociais", function(data, cb)
    redesSociais = data or {}
    SetResourceKvp("mri_esc:redes", json.encode(redesSociais))
    if cb then cb({ success = true }) end
end)

exports('AddTab', function(tab)
    if not Config.Tabs then Config.Tabs = {} end
    table.insert(Config.Tabs, tab)
end)

exports('RemoveTab', function(tabId)
    if Config.Tabs then
        for i, tab in ipairs(Config.Tabs) do
            if tab.id == tabId then
                table.remove(Config.Tabs, i)
                break
            end
        end
    end
end)

exports('GetMiraConfig', function()
    return miraConfig
end)

exports('SetMiraConfig', function(config)
    miraConfig = config
    SetResourceKvp("mri_esc:mira", json.encode(config))
    SendNUIMessage({ action = "miraData", mira = config })
end)