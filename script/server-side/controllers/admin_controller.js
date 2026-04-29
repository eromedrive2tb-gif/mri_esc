{
    const adminCooldowns = {};
    const resourceName = GetCurrentResourceName();
    const bridge = exports[resourceName];

    console.log("[vanguard_esc] ADMIN CONTROLLER JS LOADING (Full Version)...");

    const lib = {
        callback: {
            register: (name, cb) => {
                if (exports.ox_lib && exports.ox_lib.setValidCallback) {
                    exports.ox_lib.setValidCallback(name, true);
                }
                onNet(`__ox_cb_${name}`, async (resource, key, ...args) => {
                    const src = source;
                    try {
                        const result = await cb(src, ...args);
                        TriggerClientEvent(`__ox_cb_${resource}`, src, key, result);
                    } catch (err) {
                        console.error(`[vanguard_esc] Admin Callback Error [${name}]: ${err.message}`);
                        TriggerClientEvent(`__ox_cb_${resource}`, src, key, false);
                    }
                });
            }
        }
    };

    lib.callback.register('mri_esc:vip:admin:list', async (source) => {
        if (!bridge.IsAdminPlayer(source)) {
            return { list: [], stats: { total: 0, online: 0, offline: 0 } };
        }

        let list = [];
        let onlineCount = 0;
        let offlineCount = 0;

        try {
            const records = await exports.oxmysql.query_async("SELECT * FROM mri_vip_records LIMIT 500");
            console.log(`[vanguard_esc] DEBUG: Admin list SQL fetched ${records ? records.length : 0} records`);
            
            if (records && records.length > 0) {
                for (const r of records) {
                    const cid = r.citizenid || r.citizenId;
                    if (!cid) continue;
                    
                    const player = exports.qbx_core.GetPlayerByCitizenId(cid) || exports.qbx_core.GetOfflinePlayer(cid);
                    if (player) {
                        const isOnline = !player.Offline;
                        if (isOnline) onlineCount++; else offlineCount++;

                        list.push({
                            citizenid: cid,
                            name: `${player.PlayerData.charinfo.firstname} ${player.PlayerData.charinfo.lastname}`,
                            tier: r.tier || player.PlayerData.metadata['vip'] || 'nenhum',
                            online: isOnline,
                            source: isOnline ? player.PlayerData.source : null,
                            granted_at: r.granted_at || 0,
                            expires_at: r.expires_at || null,
                            total_earned: r.total_earned || 0,
                            paycheck_count: r.paycheck_count || 0,
                            granted_by: r.granted_by || 'unknown',
                        });
                    }
                }
            }
        } catch (err) {
            console.error(`[vanguard_esc] Error in admin:list SQL: ${err.message}`);
        }

        const players = exports.qbx_core.GetQBPlayers();
        const seenCids = new Set(list.map(item => item.citizenid));

        for (const key in players) {
            const player = players[key];
            const vip = player.PlayerData.metadata['vip'];
            if (vip && vip !== 'nenhum' && !seenCids.has(player.PlayerData.citizenid)) {
                onlineCount++;
                list.push({
                    citizenid: player.PlayerData.citizenid,
                    name: `${player.PlayerData.charinfo.firstname} ${player.PlayerData.charinfo.lastname}`,
                    tier: vip,
                    online: true,
                    source: player.PlayerData.source,
                    granted_at: 0,
                    expires_at: null,
                    total_earned: 0,
                    paycheck_count: 0,
                    granted_by: 'mri_qbox_metadata'
                });
            }
        }

        const safeParse = (data) => {
            if (typeof data === 'object' && data !== null) return data;
            try { return JSON.parse(data || "[]"); } catch (e) { return []; }
        };

        let allPlans = [];
        try {
            const plans = await exports.oxmysql.query_async("SELECT * FROM mri_vip_plans");
            if (plans && plans.length > 0) {
                for (const p of plans) {
                    allPlans.push({ 
                        id: p.id, 
                        label: p.label, 
                        payment: p.payment, 
                        inventory: p.inventory, 
                        benefits: safeParse(p.benefits), 
                        rewards: safeParse(p.rewards) 
                    });
                }
            }
        } catch (e) {
            console.error("[vanguard_esc] Error fetching plans via SQL:", e.message);
        }

        return {
            list,
            allPlans,
            stats: { total: onlineCount + offlineCount, online: onlineCount, offline: offlineCount }
        };
    });

    lib.callback.register('mri_esc:vip:admin:grant', async (source, data) => {
        const srcStr = source.toString();
        const nowTs = Math.floor(Date.now() / 1000);
        if (adminCooldowns[srcStr] && (nowTs - adminCooldowns[srcStr]) < 3) return { success: false, error: "Aguarde 3 segundos" };
        adminCooldowns[srcStr] = nowTs;

        if (!bridge.IsAdminPlayer(source)) return { success: false, error: "Sem permissão" };
        if (!data || !data.citizenId || !data.tier) return { success: false, error: "Dados inválidos" };

        const success = bridge.GrantVip(data.citizenId.toUpperCase(), data.tier, data.durationDays, "Admin");
        return { success };
    });

    lib.callback.register('mri_esc:vip:admin:revoke', async (source, data) => {
        if (!bridge.IsAdminPlayer(source)) return { success: false, error: "Sem permissão" };
        if (!data || !data.citizenId) return { success: false, error: "ID obrigatório" };
        const success = bridge.RevokeVip(data.citizenId.toUpperCase(), 'admin');
        return { success };
    });

    lib.callback.register('mri_esc:vip:admin:extend', async (source, data) => {
        if (!bridge.IsAdminPlayer(source)) return { success: false, error: "Sem permissão" };
        const success = bridge.ExtendVip(data.citizenId.toUpperCase(), data.tier, data.days, "Admin");
        return { success };
    });

    lib.callback.register('mri_esc:vip:admin:search', async (source, data) => {
        if (!bridge.IsAdminPlayer(source)) return [];
        if (!data || !data.query || data.query.length < 2) return [];

        const search = data.query.toLowerCase();
        const players = exports.qbx_core.GetQBPlayers();
        let results = Object.values(players)
            .map(p => ({
                citizenid: p.PlayerData.citizenid,
                name: `${p.PlayerData.charinfo.firstname} ${p.PlayerData.charinfo.lastname}`,
                online: true,
                vip: p.PlayerData.metadata['vip'] || 'nenhum'
            }))
            .filter(p => p.name.toLowerCase().includes(search) || p.citizenid.toLowerCase().includes(search));

        try {
            const rows = await exports.oxmysql.query(`
                SELECT p.citizenid,
                    CONCAT(JSON_UNQUOTE(JSON_EXTRACT(p.charinfo,'$.firstname')),' ',
                            JSON_UNQUOTE(JSON_EXTRACT(p.charinfo,'$.lastname'))) AS name,
                    JSON_UNQUOTE(JSON_EXTRACT(p.metadata,'$.vip')) AS vip
                FROM players p
                WHERE p.citizenid LIKE ? OR JSON_UNQUOTE(JSON_EXTRACT(p.charinfo,'$.firstname')) LIKE ?
            `, [`%${search}%`, `%${search}%`]);

            if (rows) {
                const seen = new Set(results.map(r => r.citizenid));
                for (const row of rows) {
                    if (!seen.has(row.citizenid)) {
                        results.push({ citizenid: row.citizenid, name: row.name, online: false, vip: row.vip || 'nenhum' });
                    }
                }
            }
        } catch (e) {}
        return results;
    });

    console.log("[vanguard_esc] ADMIN CONTROLLER JS RESTORED SUCCESSFULLY");
}
