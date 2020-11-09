// A trivial implementation of the registry spec

import { nanoid } from "nanoid";
import {
    CoreBonus,
    CoreSystem,
    Environment,
    Faction,
    Frame,
    FrameTrait,
    Manufacturer,
    MechSystem,
    MechWeapon,
    Pilot,
    PilotArmor,
    PilotGear,
    PilotWeapon,
    Quirk,
    Reserve,
    Sitrep,
    Skill,
    Status,
    TagTemplate,
    Talent,
    WeaponMod,
    Mech,
} from "@src/class";
import {
    EntryConstructor,
    EntryType,
    LiveEntryTypes,
    OpCtx,
    RegCat,
    RegEntry,
    RegEntryTypes,
    Registry,
    ReviveFunc,
} from "@src/registry";
import { RegDeployableData, RegMechData, RegPilotData } from "./interface";
import { Deployable } from "./classes/Deployable";
import { License } from './classes/License';
import { Organization } from './classes/pilot/reserves/Organization';
import { DEFAULT_MECH, DEFAULT_PILOT } from './classes/default_entries';

// This is a shared item between registries that basically just keeps their actors in sync
export class RegEnv {
    // Since actors are global, we use these to track global data
    public pilot_cat: Map<string, RegPilotData> = new Map();
    public mech_cat: Map<string, RegMechData> = new Map();
    public dep_cat: Map<string, RegDeployableData> = new Map();

    // Tracks our sub registries. These don't really clean up right now, but maybe someday
    public inventories: Map<string, StaticReg> = new Map();
}

// Our static builders
// Simple cat thing. This Takes a few liberties with the type checking but not tooo much

function simple_cat_builder<T extends EntryType>(
    type: T,
    reg: StaticReg,
    clazz: EntryConstructor<T>,
    template?: RegEntryTypes<T>,
    data_source_override?: Map<string, RegEntryTypes<T>>
): StaticRegCat<T> {
    // Our outer builder, which is used during
    return new StaticRegCat(
        reg,
        type,
        async (reg, ctx, id, raw?) => {
            // Our actual builder function. Completely unremarkable in almost every way
            let new_item = new clazz(type, reg, ctx, id, nodef(raw ?? template));
            await new_item.ready();

            // And we're done
            return new_item;
        },
        data_source_override
    );
}

// We need this to facillitate items with inventories
export class StaticReg extends Registry {
    // Simple lookup for envs. We do NOT self register
    private env: RegEnv;

    // Fetch inventory. Create if not present
    async get_inventory(for_actor_id: string): Promise<Registry | null> {
        let result = this.env.inventories.get(for_actor_id);
        if(!result) {
            result = new StaticReg(this.env);
            this.env.inventories.set(for_actor_id, result);
        }
        return result;
    }

    // Just delegates to std_builders, as we need
    constructor(env: RegEnv) {
        super();
        this.env = env;
        this.init_set_cat(simple_cat_builder(EntryType.CORE_BONUS, this, CoreBonus));
        this.init_set_cat(simple_cat_builder(EntryType.CORE_SYSTEM, this, CoreSystem));
        this.init_set_cat(simple_cat_builder(EntryType.ENVIRONMENT, this, Environment));
        this.init_set_cat(simple_cat_builder(EntryType.FACTION, this, Faction));
        this.init_set_cat(simple_cat_builder(EntryType.FRAME_TRAIT, this, FrameTrait));
        this.init_set_cat(simple_cat_builder(EntryType.FRAME, this, Frame));
        this.init_set_cat(simple_cat_builder(EntryType.LICENSE, this, License));
        this.init_set_cat(simple_cat_builder(EntryType.MANUFACTURER, this, Manufacturer));
        this.init_set_cat(simple_cat_builder(EntryType.MECH_SYSTEM, this, MechSystem));
        this.init_set_cat(simple_cat_builder(EntryType.MECH_WEAPON, this, MechWeapon));
        this.init_set_cat(simple_cat_builder(EntryType.ORGANIZATION, this, Organization));
        this.init_set_cat(simple_cat_builder(EntryType.PILOT_ARMOR, this, PilotArmor));
        this.init_set_cat(simple_cat_builder(EntryType.PILOT_GEAR, this, PilotGear));
        this.init_set_cat(simple_cat_builder(EntryType.PILOT_WEAPON, this, PilotWeapon));
        this.init_set_cat(simple_cat_builder(EntryType.QUIRK, this, Quirk));
        this.init_set_cat(simple_cat_builder(EntryType.RESERVE, this, Reserve));
        this.init_set_cat(simple_cat_builder(EntryType.SITREP, this, Sitrep));
        this.init_set_cat(simple_cat_builder(EntryType.SKILL, this, Skill));
        this.init_set_cat(simple_cat_builder(EntryType.STATUS, this, Status));
        this.init_set_cat(simple_cat_builder(EntryType.TAG, this, TagTemplate));
        this.init_set_cat(simple_cat_builder(EntryType.TALENT, this, Talent));
        this.init_set_cat(simple_cat_builder(EntryType.WEAPON_MOD, this, WeaponMod));

        // The inventoried things (actors!)
        this.init_set_cat(simple_cat_builder(EntryType.PILOT, this, Pilot, DEFAULT_PILOT(), env.pilot_cat));
        this.init_set_cat(simple_cat_builder(EntryType.DEPLOYABLE, this, Deployable, undefined, env.dep_cat));
        this.init_set_cat(simple_cat_builder(EntryType.MECH, this, Mech, DEFAULT_MECH(), env.mech_cat));
        // to be done
        // NpcClasses: null as any,
        // NpcFeatures: null as any,
        // NpcTemplates: null as any,

        this.init_finalize();
    }
}

// This implements the regcat interface with a very simple Map
export class StaticRegCat<T extends EntryType> extends RegCat<T> {
    private reg_data: Map<string, RegEntryTypes<T>> = new Map();

    constructor(
        parent: Registry,
        cat: T,
        creator: ReviveFunc<T>,
        data_source_override?: Map<string, RegEntryTypes<T>>
    ) {
        super(parent, cat, creator);
        this.cat = cat;
        this.revive_func = creator;

        if (data_source_override) {
            this.reg_data = data_source_override;
        }
    }

    async lookup_mmid(mmid: string, ctx: OpCtx): Promise<LiveEntryTypes<T> | null> {
        // lil' a bit janky, but serviceable
        for (let [reg_id, reg_raw] of this.reg_data.entries()) {
            let reg_mmid = (reg_raw as any).id;
            if (reg_mmid == mmid) {
                return this.revive_func(this.parent, ctx, reg_id, reg_raw); // Be sure to use the proper id, here!
            }
        }
        return null;
    }

    async list_live(ctx: OpCtx): Promise<LiveEntryTypes<T>[]> {
        let result: Promise<LiveEntryTypes<T>>[] = [];
        for (let [id, val] of this.reg_data.entries()) {
            result.push(this.revive_func(this.parent, ctx, id, val));
        }
        return Promise.all(result);
    }

    async create_many(...vals: RegEntryTypes<T>[]): Promise<LiveEntryTypes<T>[]> {
        let revived: Promise<LiveEntryTypes<T>>[] = [];

        // Set and revive all
        let ctx = new OpCtx();
        for (let raw of vals) {
            let new_id = nanoid();
            this.reg_data.set(new_id, raw); // It's just that easy!
            let viv = this.revive_func(this.parent, ctx, new_id, raw);
            revived.push(viv);
        }

        return Promise.all(revived);
    }

    // ez
    async get_raw(id: string): Promise<RegEntryTypes<T> | null> {
        return this.reg_data.get(id) || null;
    }

    //ezier
    async list_raw(): Promise<RegEntryTypes<T>[]> {
        return Array.from(this.reg_data.values());
    }

    // ezzzz
    async get_live(id: string, ctx: OpCtx): Promise<LiveEntryTypes<T> | null> {
        let raw = this.reg_data.get(id);
        if (!raw) {
            return null;
        }
        return this.revive_func(this.parent, ctx, id, raw);
    }

    // a bit tricky in terms of what side effects this could have, actually.
    async update(...items: LiveEntryTypes<T>[]): Promise<void> {
        for (let i of items) {
            if(!this.reg_data.has(i.RegistryID)) {
                console.warn("Tried to update a destroyed/nonexistant/non-owned item");
            }
            let saved = (await i.save()) as RegEntryTypes<T>; // Unsure why this type assertion is necessary, but oh well
            this.reg_data.set(i.RegistryID, saved);
        }
    }

    async delete_id(id: string): Promise<RegEntryTypes<T> | null> {
        let kept = this.reg_data.get(id);
        this.reg_data.delete(id);
        return kept || null;
    }

    async create_default(): Promise<LiveEntryTypes<T>> {
        let id = nanoid();
        let v = await this.revive_func(this.parent, new OpCtx(), id);
        let saved = (await v.save()) as RegEntryTypes<T>;
        this.reg_data.set(id, saved);
        return v;
    }
}

// Eventually remove this. A short term sanity not-null/undef checker, until we get around to adding defaults
function nodef(v: any) {
    if (!v) {
        throw new Error("No default supported yet");
    }
    return v;
}
