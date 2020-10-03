import _ from "lodash";
import {
    Action,
    Bonus,
    Counter,
    Damage,
    Deployable,
    Range,
    Synergy,
    TagInstance,
    WeaponMod,
    WeaponSize,
    WeaponType,
} from "@/class";
import { IDamageData, IMechEquipmentData, IRangeData, IMechWeaponSaveData, IActionData, IBonusData, ICounterData, IDeployableData, ISynergyData, ITagInstanceData } from "@/interface";
import { ActionsMixReader, ActionsMixWriter, DeployableMixWriter, ident, MixBuilder, RWMix, MixLinks, SynergyMixReader, SynergyMixWriter, TagInstanceMixReader, TagInstanceMixWriter, uuid, RangesMixReader, DamagesMixReader, DamagesMixWriter, RangesMixWriter, CountersMixReader, CountersMixWriter, DeployableMixReader, BonusesMixReader, BonusesMixWriter } from '@/mixmeta';
import { DamageType, getMountType, getWeaponSize, RangeType } from '../enums';

// TODO:
// class WeaponAmmo {}

export interface IMechWeaponData extends IMechEquipmentData {
  // Ss
  "mount": WeaponSize,
  "type": WeaponType,
  "on_attack"?: string // v-html
  "on_hit"?: string // v-html
  "on_crit"?: string // v-html
  "damage"?: IDamageData[],
  "range"?: IRangeData[],
  "profiles"?: Partial<IMechWeaponData>[], // Current profile overrides
  "selected_profile"?: number;
}

export interface MechWeapon extends MixLinks<IMechWeaponData> {
    // Fields. There are a lot - mech equips do be like that
    ID: string;
    Name: string;
    Source: string; // MANUFACTURER NAME
    License: string; // FRAME NAME
    LicenseLevel: number;
    Size: WeaponSize;
    Type: WeaponType;
    BaseDamage: Damage[];
    BaseRange: Range[];
    Tags: TagInstance[];
    SP: number;
    Description: string;
    Effect: string;
    OnAttack: string;
    OnHit: string;
    OnCrit: string;
    Actions: Action[];
    Bonuses: Bonus[];
    Synergies: Synergy[];
    Deployables: Deployable[];
    Counters: Counter[];
    Integrated: string[];

    // This comes not from our data, but from our loadout stuff
    Mod: WeaponMod;

    // Methods
}

export function CreateMechWeapon(data: IMechWeaponData): MechWeapon {
    let mb = new MixBuilder<MechWeapon, IMechWeaponData>({});
    mb.with(new RWMix("ID", "id", ident, ident ));
    mb.with(new RWMix("Name", "name", ident, ident));
    mb.with(new RWMix("Source", "source", ident, ident));
    mb.with(new RWMix("License", "license", ident, ident));
    mb.with(new RWMix("LicenseLevel", "license_level", ident, ident));
    mb.with(new RWMix("Size", "mount", getWeaponSize, ident));
    mb.with(new RWMix("Type", "type", ident, ident));
    mb.with(new RWMix("BaseDamage", "damage", DamagesMixReader, DamagesMixWriter));
    mb.with(new RWMix("BaseRange", "range", RangesMixReader, RangesMixWriter));
    mb.with(new RWMix("Tags", "tags", TagInstanceMixReader, TagInstanceMixWriter));
    mb.with(new RWMix("SP", "sp", ident, ident));
    mb.with(new RWMix("Description", "description", ident, ident));
    mb.with(new RWMix("Effect", "effect", ident, ident));
    mb.with(new RWMix("OnAttack", "on_attack", ident, ident));
    mb.with(new RWMix("OnHit", "on_hit", ident, ident));
    mb.with(new RWMix("OnCrit", "on_crit", ident, ident));

    mb.with(new RWMix("Actions", "actions", ActionsMixReader, ActionsMixWriter));
    mb.with(new RWMix("Bonuses", "bonuses", BonusesMixReader, BonusesMixWriter));
    mb.with(new RWMix("Synergies", "synergies", SynergyMixReader, SynergyMixWriter));
    mb.with(new RWMix("Deployables", "deployables", DeployableMixReader, DeployableMixWriter));
    mb.with(new RWMix("Counters", "counters", CountersMixReader, CountersMixWriter));
    mb.with(new RWMix("Integrated", "integrated", ident, ident ));

    return mb.finalize(data);
}

     function TotalSP(this: MechWeapon): number {
        if (!this.Mod) return this.SP;
        return this.Mod.SP + this.SP;
     }

    // function ModSP(): number {
        // return this.Mod ? this.Mod.SP : 0;
    // }

    function DamageType(this: MechWeapon): DamageType[] {
        return this._damage?.map(x => x.Type) || [];
    }

    function DefaultDamageType(this: MechWeapon): DamageType {
        if (0 === this.DamageType.length) {
            return DamageType.Variable;
        } else {
            return this.DamageType[0];
        }
    }

    /*
    public getTotalRange(mech: Mech): Range[] {
        const comp = store.compendium;
        const bonuses = [] as { type: RangeType; val: number }[];
        if (this.Mod && this.Mod.AddedRange)
            bonuses.push({
                type: RangeType.Range,
                val: parseInt(this.Mod.AddedRange.Value),
            });
        if (
            mech.Pilot.has(comp.getReferenceByID("CoreBonuses", "cb_neurolink_targeting")) &&
            !this.IsIntegrated
        )
            bonuses.push({
                type: RangeType.Range,
                val: 3,
            });
        if (
            mech.Pilot.has(comp.getReferenceByID("CoreBonuses", "cb_gyges_frame")) &&
            this.Type === WeaponType.Melee &&
            !this.IsIntegrated
        )
            bonuses.push({
                type: RangeType.Threat,
                val: 1,
            });
        if (
            mech.ActiveLoadout?.HasSystem("ms_external_batteries") &&
            this.Damage[0].Type === DamageType.Energy &&
            !this.IsIntegrated
        )
            if (this.Type === WeaponType.Melee) {
                bonuses.push({
                    type: RangeType.Threat,
                    val: 1,
                });
            } else {
                bonuses.push({
                    type: RangeType.Range,
                    val: 5,
                });
            }
        return Range.AddBonuses(this.Range, bonuses);
    }
    */

    function RangeTypes(this: MechWeapon): RangeType[] {
        return this.Range.map(x => x.Type);
    }
}
