-- mri_esc - Servidor Refatorado (QBX)

-- Sincronização Matemática baseada no uptime do servidor
-- Como o mri_Qbox inicia o loop no start do resource (geralmente junto com o server),
-- o tempo para o próximo pagamento é o resto da divisão do uptime pelo intervalo.
local paycheckInterval = 30 -- minutos
local intervalMs = paycheckInterval * 60000

local function GetSyncedTimeLeft()
    local uptime = GetGameTimer()
    local timeSinceLast = uptime % intervalMs
    return math.floor((intervalMs - timeSinceLast) / 1000)
end

-- Vamos registrar um callback simples no ox_lib para pegar o numero de players online
-- O restante das informacoes do jogador serao coletadas primariamente no cliente.

if GetResourceState('ox_lib') == 'started' then
    lib.callback.register('mri_esc:server:getPlayersOnline', function(source)
        return #GetPlayers()
    end)

    lib.callback.register('mri_esc:server:getVipData', function(source)
        local player = exports.qbx_core:GetPlayer(source)
        if not player then return nil end

        local vipTier = player.PlayerData.metadata['vip'] or 'nenhum'
        local coins = player.PlayerData.money.coin or 0
        
        -- Fallback robusto caso o export falhe
        local vipConfigs = {
            nenhum = { label = "Sem VIP", payment = 0, inventory = 100, benefits = {"Torne-se VIP para ganhar benefícios exclusivos!"} },
            tier1 = { 
                label = "Tier 1", 
                payment = 5000, 
                inventory = 200, 
                benefits = {
                    "Salário de R$ 5.000 a cada 30 min",
                    "Aumento de +100kg no inventário",
                    "Prioridade na fila de entrada",
                    "Acesso antecipado a novidades"
                } 
            }
        }

        -- Tenta pegar do resource mri_Qbox mas não trava se falhar
        local success, result = pcall(function()
            return exports.mri_Qbox:GetVipConfig()
        end)

        if success and result then
            vipConfigs = result
        end

        local currentVipInfo = vipConfigs[vipTier] or vipConfigs['nenhum']

        -- Garante que benefícios existam
        if not currentVipInfo.benefits or #currentVipInfo.benefits == 0 then
            if vipTier == 'tier1' then
                currentVipInfo.benefits = {
                    "Salário de R$ 5.000 a cada 30 min",
                    "Aumento de +100kg no inventário",
                    "Prioridade na fila de entrada",
                    "Acesso antecipado a novidades"
                }
            else
                currentVipInfo.benefits = {"Torne-se VIP para ganhar benefícios exclusivos!"}
            end
        end

        -- Calcula tempo restante real baseado no Uptime do Servidor (Modulo)
        local timeLeft = GetSyncedTimeLeft()

        return {
            tier = vipTier,
            label = currentVipInfo.label or "Nenhum",
            salary = currentVipInfo.payment or 0,
            inventory = currentVipInfo.inventory or 0,
            coins = coins,
            benefits = currentVipInfo.benefits,
            interval = paycheckInterval,
            timeLeft = timeLeft
        }
    end)
else
    -- Fallback se nao usar ox_lib para callback (improvavel num Qbox, mas por seguranca)
    RegisterNetEvent('mri_esc:server:reqPlayersOnline', function()
        local src = source
        TriggerClientEvent('mri_esc:client:resPlayersOnline', src, #GetPlayers())
    end)
end
