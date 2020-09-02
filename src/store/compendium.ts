import lodash from "lodash";
import * as lancerData from "@/classes/utility/typed_lancerdata";
import {
    Skill,
    Reserve,
    ContentPack,
    NpcClass,
    NpcTemplate,
    NpcFeature,
    Talent,
    CoreBonus,
    Frame,
    Manufacturer,
    Faction,
    MechWeapon,
    WeaponMod,
    MechSystem,
    PilotWeapon,
    PilotArmor,
    PilotGear,
    Tag,
    License,
    Status,
    Environment,
    Sitrep,
} from "@/class";
import { logger } from "@/hooks";
import { PilotEquipment } from "@/classes/pilot/PilotEquipment";
import { CORE_BREW_ID } from "@/classes/CompendiumItem";
import { IContentPack } from "@/classes/ContentPack";
import { AbsStoreModule, load_setter_handler, DataStoreOptions } from "./store_module";
import { PersistentStore } from "@/io/persistence";
import { Deployable } from '@/classes/Deployable';

const CORE_BONUSES = "CoreBonuses";
const DEPLOYABLES = "Deployables";
const FACTIONS = "Factions";
const FRAMES = "Frames";
const LICENSES = "Licenses";
const MANUFACTURERS = "Manufacturers";
const NPC_CLASSES = "NpcClasses";
const NPC_TEMPLATES = "NpcTemplates";
const NPC_FEATURES = "NpcFeatures";
const WEAPON_MODS = "WeaponMods";
const MECH_WEAPONS = "MechWeapons";
const MECH_SYSTEM = "MechSystems";
const PILOT_GEAR = "PilotGear";
const PILOT_ARMOR = "PilotArmor";
const PILOT_WEAPONS = "PilotWeapons";
const PILOT_EQUIPMENT = "PilotEquipment";
const TALENTS = "Talents";
const SKILLS = "Skills";
const STATUSES_AND_CONDITIONS = "StatusesAndConditions";
const STATUSES = "Statuses"; // excludes conditions
const CONDITIONS = "Conditions"; // excludes statuses
const QUIRKS = "Quirks";
const RESERVES = "Reserves";
const ENVIRONMENTS = "Environments";
const SITREPS = "Sitreps";
const TAGS = "Tags";
export const FILEKEY_CONTENT_PACKS = "extra_content.json";

// Contains the core compendium data
export class Compendium {
    [CORE_BONUSES]: CoreBonus[] = [];
    [FACTIONS]: Faction[] = [];
    [FRAMES]: Frame[] = [];
    [MANUFACTURERS]: Manufacturer[] = [];
    [NPC_CLASSES]: NpcClass[] = [];
    [NPC_TEMPLATES]: NpcTemplate[] = [];
    [NPC_FEATURES]: NpcFeature[] = [];
    [WEAPON_MODS]: WeaponMod[] = [];
    [MECH_WEAPONS]: MechWeapon[] = [];
    [MECH_SYSTEM]: MechSystem[] = [];
    [TALENTS]: Talent[] = [];
    [SKILLS]: Skill[] = [];
    [STATUSES_AND_CONDITIONS]: Status[] = [];
    [RESERVES]: Reserve[] = [];
    [ENVIRONMENTS]: Environment[] = [];
    [SITREPS]: Sitrep[] = [];
    [TAGS]: Tag[] = [];
    [LICENSES]: License[] = []; // Come from frames
    [PILOT_GEAR]: PilotGear[] = [];
    [PILOT_ARMOR]: PilotArmor[] = []; // Come from pilot gear
    [PILOT_WEAPONS]: PilotWeapon[] = []; // Come from pilot gear
    [PILOT_EQUIPMENT]: PilotEquipment[] = []; // Come from pilot gear
    [STATUSES]: Status[] = []; // Come from statuses
    [CONDITIONS]: Status[] = []; // Come from statuses
    [DEPLOYABLES]: Deployable[] = []; // Comes from anything with a DEPLOYABLES sub-item, usually systems (but also some weapons like the ghast nexus)

    // These are not ID'd
    [QUIRKS]: string[] = [];
}

export interface ICompendium extends Compendium {}

// Shorthand for valid compendium types
export type CompendiumCategory = keyof ICompendium;

// All the keys specifically in content packs. Note that some of these items are missing/ not yet able to be homebrewed
export const PackKeys: Array<keyof ContentPack & keyof Compendium> = [
    CORE_BONUSES,
    FACTIONS,
    FRAMES,
    LICENSES,
    MANUFACTURERS,
    NPC_CLASSES,
    NPC_TEMPLATES,
    NPC_FEATURES,
    WEAPON_MODS,
    MECH_WEAPONS,
    MECH_SYSTEM,
    PILOT_GEAR,
    PILOT_ARMOR,
    PILOT_WEAPONS,
    PILOT_EQUIPMENT,
    TALENTS,
    SKILLS,
    STATUSES_AND_CONDITIONS,
    STATUSES, // We did these ourselves
    CONDITIONS, // We did these ourselves
    RESERVES, // We did these ourselves
    ENVIRONMENTS, // We did these ourselves
    SITREPS, // We did these ourselves
    TAGS, // We did these ourselves
    QUIRKS, // We did these ourselves
];

// This is all compendium keys, IE items that  you can lookup by collection (and sometimes ID)
export const CompendiumKeys: CompendiumCategory[] = Object.keys(new Compendium()) as any;

// So we don't have to treat it separately
export function getBaseContentPack(): ContentPack {
    // lancerData.
    return new ContentPack({
        active: true,
        id: CORE_BREW_ID,
        manifest: {
            author: "Massif-Press",
            item_prefix: "", // Don't want one
            name: "Lancer Core Book Data",
            version: "1.X",
        },
        data: {
            coreBonuses: lancerData.core_bonuses,
            factions: lancerData.factions,
            frames: lancerData.frames,
            manufacturers: lancerData.manufacturers,
            mods: lancerData.mods,
            npcClasses: lancerData.npc_classes,
            npcFeatures: lancerData.npc_features,
            npcTemplates: lancerData.npc_templates,
            pilotGear: lancerData.pilot_gear,
            systems: lancerData.systems,
            tags: lancerData.tags,
            talents: lancerData.talents,
            weapons: lancerData.weapons,

            quirks: lancerData.quirks,
            environments: lancerData.environments,
            reserves: lancerData.reserves,
            sitreps: lancerData.sitreps,
            skills: lancerData.skills,
            statuses: lancerData.statuses,
        },
    });
}

export class CompendiumStore extends AbsStoreModule {
    // Pack management - note that we break here from the compcon way of doing it, and do not automatically save content after changes, to be more consistent with other platforms
    public _content_packs: ContentPack[] = []; // Currently loaded custom content packs.

    // Should we always include the core data?
    private _include_core: boolean = true;

    public get ContentPacks(): ContentPack[] {
        return this._content_packs;
    }

    // Delete the specified pack from loaded state
    // Automatically reloads data
    public deleteContentPack(packID: string): void {
        let i = this._content_packs.findIndex(p => p.ID == packID);
        if (i !== -1) {
            this._content_packs.splice(i, 1);
        }
        this.populate();
        this.saveData();
    }

    public constructor(persistence: PersistentStore, options: DataStoreOptions) {
        super(persistence, options);
        this._include_core = !options.disable_core_data;
    }

    // Add the given pack to loaded state. Replaces existing packs with given id
    // Automatically reloads data
    public addContentPack(pack: ContentPack): void {
        // Get existing index if any
        let i = this._content_packs.findIndex(p => p.ID == pack.ID);

        // If present, replace
        if (i !== -1) {
            let [replaced] = this._content_packs.splice(i, 1, pack);
            logger(
                `Replacing pack ${replaced.Name}:${replaced.Version} with ${pack.Name}:${pack.Version}`
            );
        } else {
            // Otherwise just push
            this._content_packs.push(pack);
        }
        this.populate();
        this.saveData();
    }

    // Flag a pack as active in the loaded state. Automatically reloads pack data
    public setPackActive(packID: string, active: boolean): void {
        // Set the specified pack as active
        let pack = this._content_packs.find(p => p.ID === packID);
        if (pack) {
            pack.SetActive(active);
        }
        this.populate();
        this.saveData();
    }

    // We can implement this mgmt functions here, regardless of anything else
    public packAlreadyInstalled(packID: string): boolean {
        return this._content_packs.some(p => p.ID == packID);
    }

    // Amends the custom content packs with the base
    private get getAll_content_packs(): ContentPack[] {
        if (this._include_core) {
            return [getBaseContentPack(), ...this._content_packs];
        } else {
            return [...this._content_packs];
        }
    }

    // (Re)loads the base lancer data, as well as any additional content packs data, from currently loaded packs/core data
    // We'll want to call this after any pack changes, to ensure data is properly updated.
    public populate(): void {
        // Get a fresh compendium
        let comp = new Compendium();

        // Load data from pack
        for (let pack of this.getAll_content_packs.filter(p => p.Active)) {
            // Just do this part via iteration
            for (let k of PackKeys) {
                // Get the items
                let items = pack[k];

                // Push them on
                if (items) {
                    comp[k].push(...(items as any));
                } else {
                    logger(`Error: Content pack missing ${k} array`);
                }
            }
        }

        // Set compendium
        this.compendium = comp;

        // Update frame licenses
        for (let l of comp[LICENSES]) {
            l.updateUnlocks();
        }
    }

    public compendium: Compendium = new Compendium();

    // This variant panics on null
    public instantiate<T extends CompendiumCategory>(itemType: T, id: string): ICompendium[T][0] {
        let v = this.instantiateCareful(itemType, id);
        if (!v) {
            throw new TypeError(`Could not create item ${id} of category ${itemType}`);
        }
        return v;
    }

    // Instantiate an item from a collection
    // Note that functionally, this is just getReferenceByID except if you want to change it afterwards (e.g. an NPC)
    public instantiateCareful<T extends CompendiumCategory>(
        itemType: T,
        id: string
    ): ICompendium[T][0] | null {
        let v = this.getReferenceByID(itemType, id);
        if (!v) {
            return v;
        } else {
            return lodash.cloneDeep(v);
        }
    }

    // Get a specific item from an item collection
    // public getReferenceByID<T>(itemType: LookupType, id: string): T | { err: string } { // Can we make this generic work?
    public getReferenceByIDCareful<T extends CompendiumCategory>(
        itemType: T,
        id: string
    ): ICompendium[T][0] | null {
        const items = this.getItemCollection(itemType);
        // Typescript cannot consolidate predicates, so we treat as any.
        const i = (items as Array<any>).find(x => x.ID === id || x.id === id);
        return i || null;
    }

    // Panic on null
    public getReferenceByID<T extends CompendiumCategory>(
        itemType: T,
        id: string
    ): ICompendium[T][0] {
        let v = this.getReferenceByIDCareful(itemType, id);
        if (!v) {
            throw new TypeError(`Invalid item ${id} of category ${itemType}`);
        }
        return v;
    }

    // Get the item collection of the provided type
    public getItemCollection<T extends CompendiumCategory>(itemType: T): ICompendium[T] {
        return this.compendium[itemType];
    }

    public async loadData(handler: load_setter_handler<CompendiumStore>): Promise<void> {
        // Load the contact packs themselves from static storage
        let ser_packs =
            (await this.persistence.get_item<IContentPack[]>(FILEKEY_CONTENT_PACKS)) || [];
        let deser = ser_packs.map(cp => new ContentPack(cp));

        // Set when able
        handler(cs => {
            cs._content_packs = deser;
            cs.populate();
        });
    }

    public async saveData(): Promise<void> {
        // Save the content packs to static storage
        let data_packs = this._content_packs.map(ContentPack.Serialize);
        await this.persistence.set_item(FILEKEY_CONTENT_PACKS, data_packs);
    }
}
