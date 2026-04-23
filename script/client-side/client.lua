local Config = config or {} -- Wait, needs LoadResourceFile or shared_script to provide Config. Let's do a safe load.
Config = LoadResourceFile(GetCurrentResourceName(), "config/config.lua")
if Config then
    local chunk = load(Config)
    if chunk then
        Config = chunk()
    end
end

if not Config then Config = {} end

local open = false
local pauseMenu = false
local miraConfig = { ativo = false }
local redesSociais = { instagram = "", tiktok = "", youtube = "" }

-- KVP Load (Cache do Jogo)
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

--------------------------------------------------------------------------------
-- Esconder mira nativa
--------------------------------------------------------------------------------
CreateThread(function()
    while true do
        Wait(0)
        DisableControlAction(0, 200, true) -- Bloqueia ESC nativo
        if miraConfig and miraConfig.ativo then
            HideHudComponentThisFrame(14)
        end
    end
end)

--------------------------------------------------------------------------------
-- Menu principal (ESC)
--------------------------------------------------------------------------------
RegisterCommand("open_menu", function()
    print("[MRI_ESC DEBUG LUA] Command open_menu executed!")
    if not LocalPlayer.state.isLoggedIn or LocalPlayer.state.inArena or LocalPlayer.state.isDead or LocalPlayer.state.invOpen then
        print("[MRI_ESC DEBUG LUA] Blocked by state flags!")
        return
    end

    if not pauseMenu and not IsPauseMenuActive() then
        print("[MRI_ESC DEBUG LUA] Sending showMenu to NUI...")
        local playersOn = GetPlayersOnline()
        local playerData = GetPlayerData()
        
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

        SendNUIMessage({
            action = "showMenu",
            playersOn = playersOn,
            nome = nome,
            id = id,
            money = money,
            bank = bank,
            job = jobText
        })

        SetNuiFocus(true, true)
        StartScreenEffect("MenuMGSelectionIn", 0, true)
        TriggerEvent("hud:Active", false)
        open = true
        print("[MRI_ESC DEBUG LUA] Menu successfully opened.")
    else
        print("[MRI_ESC DEBUG LUA] Blocked by pauseMenu or IsPauseMenuActive!")
    end
end)
RegisterKeyMapping("open_menu", "Abrir Esc Menu", "keyboard", "ESCAPE")

local function closeMenu(ignoreFrontend)
    print("[MRI_ESC DEBUG LUA] Executing closeMenu function...")
    -- Fecha a UI instantaneamente
    SendNUIMessage({ action = "hideMenu" })
    StopScreenEffect("MenuMGSelectionIn")
    print("[MRI_ESC DEBUG LUA] Stopped screen effect MenuMGSelectionIn!")
    open = false
    TriggerEvent("hud:Active", true)

    -- FIX DEFINITIVO: O FiveM "vaza" a tecla ESC de volta para o jogo se o foco NUI for tirado 
    -- exatamente no mesmo milissegundo em que o ESC está soltando (keyup).
    CreateThread(function()
        if not ignoreFrontend then SetFrontendActive(false) end -- Aborta qualquer pause nativo que tente abrir
        Wait(150) -- "Come" o evento físico do ESC na UI invisível
        SetNuiFocus(false, false)
        if not ignoreFrontend then SetFrontendActive(false) end -- Garante duplo kill no menu nativo
        print("[MRI_ESC DEBUG LUA] Thread delayed focus release completed.")
    end)
end

RegisterNUICallback("close", function(_, cb)
    print("[MRI_ESC DEBUG LUA] NUI Callback 'close' received!")
    closeMenu()
    if cb then cb({ success = true }) end
end)

RegisterNUICallback("mapa", function(_, cb)
    print("[MRI_ESC DEBUG LUA] NUI Callback 'mapa' received!")
    closeMenu(true)
    Wait(100)
    ActivateFrontendMenu(GetHashKey("FE_MENU_VERSION_MP_PAUSE"), 0, -1)
    if cb then cb({ success = true }) end
end)

RegisterNUICallback("config", function(_, cb)
    print("[MRI_ESC DEBUG LUA] NUI Callback 'config' received!")
    closeMenu(true)
    Wait(100)
    ActivateFrontendMenu(GetHashKey("FE_MENU_VERSION_LANDING_MENU"), 0, -1)
    if cb then cb({ success = true }) end
end)

--------------------------------------------------------------------------------
-- Comandos
--------------------------------------------------------------------------------
RegisterNUICallback("consultComandos", function(_, cb)
    if cb then cb({ tabela = Config.Comandos or {} }) end
end)

RegisterNUICallback("executarComando", function(data, cb)
    if data.comando then
        ExecuteCommand(data.comando)
    end
    if cb then cb({ success = true }) end
end)

--------------------------------------------------------------------------------
-- Mira
--------------------------------------------------------------------------------
RegisterNUICallback("consultMira", function(_, cb)
    if cb then cb({ tabela = miraConfig }) end
end)

RegisterNUICallback("salvarMira", function(data, cb)
    miraConfig = data
    SetResourceKvp("mri_esc:mira", json.encode(data))
    if cb then cb({ success = true }) end
end)

--------------------------------------------------------------------------------
-- Redes sociais
--------------------------------------------------------------------------------
RegisterNUICallback("consultRedesSociais", function(_, cb)
    if cb then cb({ success = true, instagram = redesSociais.instagram, tiktok = redesSociais.tiktok, youtube = redesSociais.youtube }) end
end)

RegisterNUICallback("salvarRedesSociais", function(data, cb)
    redesSociais = data or {}
    SetResourceKvp("mri_esc:redes", json.encode(redesSociais))
    if cb then cb({ success = true }) end
end)
