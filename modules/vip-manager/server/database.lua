-- =============================================================
--  mri_esc — VIP Manager Module (Database Atom)
-- =============================================================

VipPlansConfigs = {}
local mysqlReady = false

CreateThread(function()
    Wait(1000)
    mysqlReady = (GetResourceState('oxmysql') == 'started')
    
    if mysqlReady then
        MySQL.query([[
            CREATE TABLE IF NOT EXISTS `mri_vip_records` (
                `citizenid`      VARCHAR(50)  NOT NULL,
                `tier`           VARCHAR(50)  NOT NULL,
                `granted_at`     INT(11)      NOT NULL,
                `expires_at`     INT(11)      DEFAULT NULL,
                `granted_by`     VARCHAR(100) DEFAULT 'system',
                `total_earned`   INT(11)      DEFAULT 0,
                `paycheck_count` INT(11)      DEFAULT 0,
                `updated_at`     INT(11)      DEFAULT NULL,
                PRIMARY KEY (`citizenid`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        ]])

        MySQL.query([[
            CREATE TABLE IF NOT EXISTS `mri_vip_plans` (
                `id`         VARCHAR(50)  NOT NULL,
                `label`      VARCHAR(100) NOT NULL,
                `payment`    INT          NOT NULL DEFAULT 0,
                `inventory`  INT          NOT NULL DEFAULT 0,
                `benefits`   LONGTEXT     DEFAULT '[]',
                `rewards`    LONGTEXT     DEFAULT '[]',
                `updated_at` INT(11)      DEFAULT NULL,
                PRIMARY KEY (`id`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        ]])

        -- Auto-update table if column missing
        CreateThread(function()
            Wait(2000)
            MySQL.query("ALTER TABLE `mri_vip_plans` ADD COLUMN IF NOT EXISTS `rewards` LONGTEXT DEFAULT '[]'")
        end)
        
        Wait(500)
        LoadVipPlans()
    end
end)

function LoadVipPlans()
    if not mysqlReady then return end
    local ok, results = pcall(function()
        return MySQL.query.await("SELECT * FROM mri_vip_plans")
    end)
    
    if ok and results and #results > 0 then
        local newPlans = {}
        for _, p in ipairs(results) do
            newPlans[p.id] = {
                label     = p.label,
                payment   = p.payment,
                inventory = p.inventory,
                benefits  = json.decode(p.benefits or "[]"),
                rewards   = json.decode(p.rewards  or "[]")
            }
        end
        VipPlansConfigs = newPlans
    else
        VipPlansConfigs = {}
    end
end

function GetVipConfigs()
    local cfg = {}
    -- Copy current plans from DB
    if VipPlansConfigs then
        for k, v in pairs(VipPlansConfigs) do cfg[k] = v end
    end
    -- Safety fallback ONLY for the 'nenhum' key (required for UI stability)
    if not cfg['nenhum'] then
        cfg['nenhum'] = { 
            label = "Sem VIP", 
            payment = 0, 
            inventory = 100,
            benefits = { "Torne-se VIP para ganhar benefícios exclusivos!" }
        }
    end
    return cfg
end

--- Safely fetches a VIP record from the database
--- @param cid string
--- @return table | nil
function SafeGetVipRecord(cid)
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
