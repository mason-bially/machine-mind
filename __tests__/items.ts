
// @ts-nocheck
import "jest";
import { StaticReg, RegEnv } from "../src/static_registry";
import { RegCat, OpCtx, Registry, InventoriedRegEntry, EntryType, OpCtx } from "../src/registry";
import { CoreBonus, Range, Counter, Frame, Range, MechSystem, MechWeapon, Damage } from "../src/class";
import { get_base_content_pack } from '../src/io/ContentPackParser';
import { intake_pack } from '../src/classes/ContentPack';
import { DamageType, RangeType, WeaponSize } from "@src/enums";
import { LicenseScan } from "../src/classes/License";

type DefSetup = {
    reg: StaticReg;
    env: RegEnv;
}

async function init_basic_setup(include_base: boolean = true): Promise<DefSetup> {
    let env = new RegEnv();
    let reg = new StaticReg(env);

    if(include_base) {
        let bcp = get_base_content_pack();
        await intake_pack(bcp, reg);
    }

    return {env, reg};
}

describe("Items Miscellania", () => {
    it("Weapons bring in their size correctly", async () => {
        expect.assertions(4);
        let s = await init_basic_setup(true);
        let c = s.reg.get_cat(EntryType.MECH_WEAPON);
        let ctx = new OpCtx();

        let fold_knife = await c.lookup_lid_live(ctx, "mw_fold_knife");
        let assault_rifle = await c.lookup_lid_live(ctx, "mw_assault_rifle");
        let kinetic_hammer = await c.lookup_lid_live(ctx, "mw_kinetic_hammer");
        let siege_cannon = await c.lookup_lid_live(ctx, "mw_siege_cannon");

        expect(fold_knife.Size).toEqual(WeaponSize.Aux);
        expect(assault_rifle.Size).toEqual(WeaponSize.Main);
        expect(kinetic_hammer.Size).toEqual(WeaponSize.Heavy);
        expect(siege_cannon.Size).toEqual(WeaponSize.Superheavy);
    });

    it("Neuro-linked targeting works", async () => {
        expect.assertions(6);
        let s = await init_basic_setup(true);
        let guns = s.reg.get_cat(EntryType.MECH_WEAPON);
        let bots = s.reg.get_cat(EntryType.MECH);
        let pilots = s.reg.get_cat(EntryType.PILOT);
        let bonuses = s.reg.get_cat(EntryType.CORE_BONUS);
        let ctx = new OpCtx();

        // Create our actors
        let pilot = await pilots.create_live(ctx, {});
        let mech = await bots.create_live(ctx, {});
        mech.Pilot = pilot;
        await mech.writeback();

        // Fetch our items
        let global_ar = await guns.lookup_lid_live(ctx, "mw_assault_rifle");
        let global_tk = await guns.lookup_lid_live(ctx, "mw_tactical_knife");
        let global_nl = await bonuses.lookup_lid_live(ctx, "cb_neurolink_targeting");

        // Put them in
        let mech_inv = await mech.get_inventory();
        let pilot_inv = await pilot.get_inventory();
        let mech_ar = await global_ar.insinuate(mech_inv);
        let mech_tk = await global_tk.insinuate(mech_inv);
        let pilot_nl = await global_nl.insinuate(pilot_inv);

        // Reload actors
        ctx = new OpCtx();
        pilot = await pilot.refreshed(ctx);
        mech = await mech.refreshed(ctx);

        // Now, the AR should have a range of 10+3 = 13 because of the nl targeting
        let ar_ranges = Range.calc_range_with_bonuses(mech_ar, mech_ar.SelectedProfile, mech);
        expect(ar_ranges.length).toEqual(1);
        expect(ar_ranges[0].RangeType).toEqual(RangeType.Range);
        expect(ar_ranges[0].Value).toEqual("13");

        // The tac knife should still be threat 1
        let tk_ranges = Range.calc_range_with_bonuses(mech_tk, mech_tk.SelectedProfile, mech);
        expect(tk_ranges.length).toEqual(1);
        expect(tk_ranges[0].RangeType).toEqual(RangeType.Threat);
        expect(tk_ranges[0].Value).toEqual("1");
    });

    it("Autopod isn't working but hopefully this test will tell us why", async () => {
        expect.assertions(1);
        let s = await init_basic_setup(true);
        let guns = s.reg.get_cat(EntryType.MECH_WEAPON);
        let ctx = new OpCtx();

        let autopod = await guns.lookup_lid_live(ctx, "mw_autopod");

        expect(!!autopod).toBeTruthy();
    });

    it("Damages combine properly", async () => {
        let a = [
            new Damage({
                type: DamageType.Kinetic,
                val: "2d6 + 3"
            }), 
            new Damage({
                type: DamageType.Energy,
                val: "1d6"
            })
        ];

        let b = [
            new Damage({
                type: DamageType.Energy,
                val: "1d6"
            }), 
            new Damage({
                type: DamageType.Burn,
                val: "1d6"
            })
        ];

        let c = Damage.CombineLists(a, b);
        expect(c[0].DamageType).toEqual(DamageType.Kinetic);
        expect(c[1].DamageType).toEqual(DamageType.Energy);
        expect(c[2].DamageType).toEqual(DamageType.Burn);
        expect(c[0].Value).toEqual("2d6 + 3");
        expect(c[1].Value).toEqual("1d6 + 1d6");
        expect(c[2].Value).toEqual("1d6");

    });

    it("Ranges combine properly", async () => {
        let a = [
            new Range({
                type: RangeType.Range,
                val: "10"
            }), 
            new Range({
                type: RangeType.Blast,
                val: "2"
            })
        ];

        let b = [
            new Range({
                type: RangeType.Range,
                val: "5"
            }), 
            new Range({
                type: RangeType.Blast,
                val: "1"
            }), 
            new Range({
                type: RangeType.Threat,
                val: "3"
            })
        ];

        let c = Range.CombineLists(a, b);
        expect(c[0].RangeType).toEqual(RangeType.Range);
        expect(c[1].RangeType).toEqual(RangeType.Blast);
        expect(c[2].RangeType).toEqual(RangeType.Threat);
        expect(c[0].Value).toEqual("10 + 5");
        expect(c[1].Value).toEqual("2 + 1");
        expect(c[2].Value).toEqual("3");
    });

    it("Frames shouldn't actually have tags anymore, weirdly enough", async () => {
        expect.assertions(1);
        let s = await init_basic_setup(true);
        let frames = s.reg.get_cat(EntryType.FRAME);
        let ctx = new OpCtx();

        let balor: Frame = await frames.lookup_lid_live(ctx, "mf_balor");

        expect(balor.CoreSystem.Tags.length).toEqual(0);
    });

    it("Licenses scan properly", async () => {
        expect.assertions(1 + 29 + 12);
        let s = await init_basic_setup(true);
        let lic_cat = s.reg.get_cat(EntryType.LICENSE);
        let ctx = new OpCtx();

        // Get them all. In base code, every single non-gms one should have 7 items, and there are 28 in total
        let all_licenses = await lic_cat.list_live(ctx);
        expect(all_licenses.length).toEqual(29); // 7 for each faction + the gms
        for(let l of all_licenses) {
            let scan = await l.scan([s.reg], ctx)
            let exp_count = l.Name == "GMS" ? 46 : 7;
            expect(scan.AllItems.length).toEqual(exp_count); // 29
        }

        // Check a specific for its ranks being correct
        let balor: License = await lic_cat.lookup_lid_live(ctx, "lic_balor");
        expect(balor.LicenseKey).toEqual("BALOR"); // 1
        let balor_scan = await balor.scan([s.reg], ctx);

        // Validate numbers
        expect(balor_scan.ByLevel.get(0)).toBeFalsy();
        expect(balor_scan.ByLevel.get(1).length).toEqual(2);
        expect(balor_scan.ByLevel.get(2).length).toEqual(3);
        expect(balor_scan.ByLevel.get(3).length).toEqual(2); // 5

        // Validate unlocks
        expect(balor_scan.Unlocked(0).length).toEqual(0);
        expect(balor_scan.Unlocked(1).length).toEqual(2);
        expect(balor_scan.Unlocked(2).length).toEqual(5);
        expect(balor_scan.Unlocked(3).length).toEqual(7); // 9

        // I guess make sure things are in the right place
        expect(balor_scan.ByLevel.get(3)[0].Name).toEqual("NANOBOT WHIP"); 
        expect(balor_scan.ByLevel.get(3)[1].Name).toEqual("SWARM/HIVE NANITES"); // 11

        // GMS stuff should all be accessible at lvl 0
        let gms: License = await lic_cat.lookup_lid_live(ctx, "lic_gms");
        let gms_scan = await gms.scan([s.reg], ctx);
        expect(gms_scan.AllItems.length).toEqual(gms_scan.Unlocked(0).length); // 12
    });

    it("Properly deduplicates LIDs", async () => {
        expect.assertions(9);
        let s = await init_basic_setup(true);
        let lic_cat = s.reg.get_cat(EntryType.LICENSE);
        let frame_cat = s.reg.get_cat(EntryType.FRAME);
        let pilot_cat = s.reg.get_cat(EntryType.PILOT);
        let ctx = new OpCtx();

        let pilot = await pilot_cat.create_default(ctx);
        let balor_lic = await lic_cat.lookup_lid_live(ctx, "lic_balor");
        let balor_frame = await frame_cat.lookup_lid_live(ctx, "mf_balor");

        let pilot_inv = await pilot.get_inventory();
        let pilot_balor_lic = await balor_lic.insinuate(pilot_inv, ctx);
        let pilot_balor_frame = await balor_frame.insinuate(pilot_inv, ctx); // this isn't how we'd typically do it, but fine for now


        // Check that it shows up now. This is unnecessary for the test to work (the repopulation), but we're just checking its behavior generally
        await pilot.repopulate_inventory();
        expect(pilot.Licenses.length).toEqual(1);
        expect(pilot.Licenses[0]).toBe(pilot_balor_lic); // 2

        // Scan pilot license on source reg
        let glob_scan: LicenseScan = await pilot_balor_lic.scan([s.reg], ctx);
        let inv_scan: LicenseScan = await pilot_balor_lic.scan([pilot_inv], ctx);
        let both_scan: LicenseScan = await pilot_balor_lic.scan([pilot_inv, s.reg], ctx);
        let both_scan_allow_dup: LicenseScan = await pilot_balor_lic.scan([pilot_inv, s.reg], ctx, false);
        let double_glob_scan: LicenseScan = await pilot_balor_lic.scan([s.reg, s.reg], ctx);
        let double_glob_scan_allow_dup: LicenseScan = await pilot_balor_lic.scan([s.reg, s.reg], ctx, false);

        expect(glob_scan.AllItems.length).toEqual(7);
        expect(inv_scan.AllItems.length).toEqual(1);
        expect(inv_scan.AllItems[0]).toBe(pilot_balor_frame);// 5
        expect(both_scan.AllItems.length).toEqual(7); 
        expect(both_scan_allow_dup.AllItems.length).toEqual(8);
        expect(double_glob_scan.AllItems.length).toEqual(7);
        expect(double_glob_scan_allow_dup.AllItems.length).toEqual(14); // 9


    });
});
