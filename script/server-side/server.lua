-- =============================================================
--  mri_esc — Server Principal (QBX)
-- =============================================================

local paycheckInterval = 30
local intervalMs       = paycheckInterval * 60000

local function GetSyncedTimeLeft()
    local uptime        = GetGameTimer()
    local timeSinceLast = uptime % intervalMs
    return math.floor((intervalMs - timeSinceLast) / 1000)
end

-- Tenta ler registro do DB com segurança — retorna nil se MySQL não disponível
local function SafeGetVipRecord(cid)
    if not MySQL or not MySQL.query then return nil end
    local ok, result = pcall(function()
        return MySQL.query.await(
            "SELECT * FROM mri_vip_records WHERE citizenid = ?",
            { cid }
        )
    end)
    if ok and result then return result[1] end
    return nil
end

if GetResourceState('ox_lib') == 'started' then

    lib.callback.register('mri_esc:server:getPlayersOnline', function()
        return #GetPlayers()
    end)

    lib.callback.register('mri_esc:server:getVipData', function(source)
        local player = exports.qbx_core:GetPlayer(source)
        if not player then return nil end

        local vipTier = player.PlayerData.metadata['vip'] or 'nenhum'
        local coins   = player.PlayerData.money.coin or 0
        local cid     = player.PlayerData.citizenid

        -- Config de benefícios via mri_Qbox (com fallback)
        local vipConfigs = {
            nenhum = {
                label    = "Sem VIP", payment = 0, inventory = 100,
                benefits = { "Torne-se VIP para ganhar benefícios exclusivos!" }
            },
            tier1  = {
                label    = "Tier 1", payment = 5000, inventory = 200,
                benefits = {
                    "Salário de R$ 5.000 a cada 30 min",
                    "Aumento de +100kg no inventário",
                    "Prioridade na fila de entrada",
                    "Acesso antecipado a novidades"
                }
            }
        }

        local cfgOk, cfg = pcall(function() return exports.mri_Qbox:GetVipConfig() end)
        if cfgOk and cfg then vipConfigs = cfg end

        local currentVipInfo = vipConfigs[vipTier] or vipConfigs['nenhum']
        if not currentVipInfo.benefits or #currentVipInfo.benefits == 0 then
            currentVipInfo.benefits = { "Benefícios não configurados para este tier." }
        end

        -- Lê métricas do DB (graceful — retorna nil se MySQL ainda não disponível)
        local r = SafeGetVipRecord(cid)

        local vipSince      = r and r.granted_at   or (vipTier ~= 'nenhum' and 0 or nil)
        local vipExpires    = r and r.expires_at    or nil
        local totalEarned   = r and r.total_earned  or 0
        local paycheckCount = r and r.paycheck_count or 0

        local daysActive = 0
        if vipSince and vipSince > 0 then
            daysActive = math.floor((os.time() - vipSince) / 86400)
        end

        local isExpired = false
        local daysLeft  = nil
        if vipExpires and vipExpires > 0 then
            local diff = vipExpires - os.time()
            isExpired  = diff <= 0
            daysLeft   = math.max(0, math.floor(diff / 86400))
        end

        local charName = string.format("%s %s",
            player.PlayerData.charinfo.firstname or "",
            player.PlayerData.charinfo.lastname  or "")

        local srcStr = tostring(source)
        local isAdmin = false

        -- ACE 'admin' (confirmado via debug)
        if IsPlayerAceAllowed(srcStr, "admin")
        or IsPlayerAceAllowed(srcStr, "group.admin")
        or IsPlayerAceAllowed(srcStr, "group.superadmin") then
            isAdmin = true
        end

        -- qbx_core:HasPermission (confirmado via debug)
        if not isAdmin then
            local ok, r = pcall(function()
                return exports.qbx_core:HasPermission(source, 'admin')
            end)
            if ok and r then isAdmin = true end
        end

        -- Fallback: Config.AdminIds
        if not isAdmin and Config and Config.AdminIds then
            local ids = {}
            for i = 0, GetNumPlayerIdentifiers(source) - 1 do
                ids[i] = GetPlayerIdentifier(source, i)
            end
            for _, adminId in ipairs(Config.AdminIds) do
                for _, pid in pairs(ids) do
                    if pid == adminId then isAdmin = true; break end
                end
                if isAdmin then break end
            end
        end

        return {
            tier          = vipTier,
            label         = currentVipInfo.label    or "Nenhum",
            salary        = currentVipInfo.payment  or 0,
            inventory     = currentVipInfo.inventory or 0,
            coins         = coins,
            benefits      = currentVipInfo.benefits,
            interval      = paycheckInterval,
            timeLeft      = GetSyncedTimeLeft(),
            vipSince      = vipSince,
            vipExpires    = vipExpires,
            daysActive    = daysActive,
            daysLeft      = daysLeft,
            isExpired     = isExpired,
            totalEarned   = totalEarned,
            paycheckCount = paycheckCount,
            charName      = charName,
            citizenId     = cid,
            isAdmin       = isAdmin,
        }
    end)

else
    RegisterNetEvent('mri_esc:server:reqPlayersOnline', function()
        TriggerClientEvent('mri_esc:client:resPlayersOnline', source, #GetPlayers())
    end)
end
