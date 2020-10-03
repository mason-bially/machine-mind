import { CompendiumItem, EntryType, Manufacturer, EquippableMount } from "@/class";
import { store } from "@/hooks";

import { IActionData, IBonusData, ISynergyData, IDeployableData, ICounterData, ICompendiumItemData } from "@/interface";
import { MixLinks } from '@/mixmeta';
import { IHasActions, IHasBonuses, IHasSynergies, IHasDeployables, IHasCounters, IHasIntegrated, MixActions, MixBonuses, MixSynergies, MixDeployables, MixCounters, MixIntegrated, VRegistryItem } from '../registry;

export interface ICoreBonusData extends ICompendiumItemData, IHasActions, IHasBonuses, IHasSynergies, IHasDeployables, IHasCounters, IHasIntegrated {
  "id": string,
  "name": string,
  "source": string, // must be the same as the Manufacturer ID to sort correctly
  "effect": string, // v-html
  "description": string, // v-html
  "mounted_effect"?: string
  "actions"?: IActionData[],
  "bonuses"?: IBonusData[]
  "synergies"?: ISynergyData[]
  "deployables"?: IDeployableData[],
  "counters"?: ICounterData[],
  "integrated"?: string[]
}

export interface CoreBonus extends MixLinks<ICoreBonusData>, VRegistryItem {
  Type: EntryType.CORE_BONUS
  ID: string;
  Name: string;
  Description: string;
  Source: string;
  


}

export class CoreBonusold extends CompendiumItem<ICoreBonusData> {
    // Mixins
    public readonly Actions = new MixActions();
    public readonly Bonuses = new MixBonuses();
    public readonly Synergies = new MixSynergies();
    public readonly Deployables = new MixDeployables();
    public readonly Counters = new MixCounters();
    public readonly Integrated = new MixIntegrated();

    private _source: string; 
    public get Source(): string { return this._source ;}
    public set Source(nv: string) { this._source = nv ;}

    private _effect: string; 
    public get Effect(): string { return this._effect ;}
    public set Effect(nv: string) { this._effect = nv ;}


    private _mounted_effect: string | null;
    public get MountedEffect(): string | null { return this._mounted_effect; }
    public set MountedEffect(nv: string | null) { this._mounted_effect = nv; }

    public constructor(cbData: ICoreBonusData) {
        super(cbData);

        // Handle mixins
        let mixins = [this.Actions, this.Bonuses, this.Synergies, this.Deployables, this.Counters, this.Integrated];
        this.register_mixins(mixins);
        this.load(cbData);

        // Handle specific data
        this._source = cbData.source;
        this._effect = cbData.effect;
        this._mounted_effect = cbData.mounted_effect || null;
    }
}
