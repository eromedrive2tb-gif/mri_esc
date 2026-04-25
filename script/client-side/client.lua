-- =============================================================
--  mri_esc — Main Client Entry Point
-- =============================================================

local Config = Config or {}
open = false
redesSociais = { instagram = "", tiktok = "", youtube = "" }
local cachedTabs = nil

-- Initial Load
CreateThread(function()
    local savedRedes = GetResourceKvpString("mri_esc:redes")
    if savedRedes then
        local ok, decoded = pcall(json.decode, savedRedes)
        if ok and decoded then redesSociais = decoded end
    end
end)

-- ── HELPERS ─────────────────────────────────────────────────

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

local function BuildTabsConfig()
    local defaultTabs = {
        { id = 'inicio', label = 'INÍCIO', icon = 'fa-bars', action = 'inicio' },
        { id = 'mapa', label = 'MAPA', icon = 'fa-map', action = 'mapa' },
        { id = 'customizacao', label = 'CUSTOMIZAÇÃO', icon = 'fa-user', action = 'customizacao' },
        { id = 'config', label = 'CONFIGURAÇÕES', icon = 'fa-cog', action = 'config' }
    }
    if Config.Tabs then
        for _, tab in ipairs(Config.Tabs) do table.insert(defaultTabs, tab) end
    end
    return defaultTabs
end

local function GetCachedTabs()
    if not cachedTabs then cachedTabs = BuildTabsConfig() end
    return cachedTabs
end

-- ── MAIN LOGIC ──────────────────────────────────────────────

function closeMenu(ignoreFrontend)
    open = false
    SendNUIMessage({ action = "hideMenu" })
    StopScreenEffect("MenuMGSelectionIn")
    StopAllScreenEffects()
    TriggerEvent("hud:Active", true)

    CreateThread(function()
        if not ignoreFrontend then SetFrontendActive(false) end
        Wait(150)
        SetNuiFocus(false, false)
        if not ignoreFrontend then SetFrontendActive(false) end
    end)
end

RegisterCommand("open_menu", function()
    if not LocalPlayer.state.isLoggedIn or LocalPlayer.state.inArena or LocalPlayer.state.isDead or LocalPlayer.state.invOpen then
        return
    end

    if open then return end

    local playersOn = GetPlayersOnline()
    local playerData = GetPlayerData()
    local vipData = lib.callback.await('mri_esc:server:getVipData', false)
    
    local nome = "Jogador"
    local id = GetPlayerServerId(PlayerId())
    local money, bank = 0, 0
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

    local isAdmin = vipData and vipData.isAdmin == true
    local coords = GetEntityCoords(PlayerPedId())

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
        playerX   = coords.x,
        playerY   = coords.y,
        tabs      = GetCachedTabs()
    })

    if isAdmin then TriggerEvent('mri_esc:client:adminReady') end

    Wait(50)
    SetNuiFocus(true, true)
    StartScreenEffect("MenuMGSelectionIn", 0, true)
    TriggerEvent("hud:Active", false)
    open = true
end)

RegisterKeyMapping("open_menu", "Abrir Esc Menu", "keyboard", "ESCAPE")

RegisterNetEvent('mri_esc:client:refreshVip', function()
    if open then
        local vipData = lib.callback.await('mri_esc:server:getVipData', false)
        SendNUIMessage({
            action = "updateVipData",
            vip = vipData
        })
    end
end)

-- Global Thread for UI protection
CreateThread(function()
    while true do
        Wait(0)
        DisableControlAction(0, 200, true) -- ESC
    end
end)

-- ── EXPORTS ─────────────────────────────────────────────────

exports('AddTab', function(tab)
    if not Config.Tabs then Config.Tabs = {} end
    table.insert(Config.Tabs, tab)
    cachedTabs = nil
end)

exports('RemoveTab', function(tabId)
    if Config.Tabs then
        for i, tab in ipairs(Config.Tabs) do
            if tab.id == tabId then
                table.remove(Config.Tabs, i)
                cachedTabs = nil
                break
            end
        end
    end
end)