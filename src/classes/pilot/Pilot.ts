import _, { identity } from "lodash";
import uuid from "uuid/v4";
import {
    Rules,
    Reserve,
    MechSkills,
    PilotLicense,
    PilotLoadout,
    PilotSkill,
    PilotTalent,
    Skill,
    License,
    Talent,
    CoreBonus,
    Mech,
    CustomSkill,
    Organization,
    CompendiumItem,
    ContentPack,
    Faction,
} from "@/class";
import * as gistApi from "@/io/apis/gist";
import { ICounterData, IAction, IPilotLoadoutData, IMechData, IMechState, IOrganizationData, IReserveData, IRankedData, ICounterSaveData } from "@/interface";
import { store } from "@/hooks";
import { ActiveState } from "../mech/ActiveState";

export interface IPilotData {
    id: string;
    campaign: string;
    group: string;
    sort_index: number;
    cloudID: string;
    cloudOwnerID: string;
    lastCloudUpdate: string;
    level: number;
    callsign: string;
    name: string;
    player_name: string;
    status: string;
    factionID: string;
    text_appearance: string;
    notes: string;
    history: string;
    portrait: string;
    cloud_portrait: string;
    quirk: string;
    current_hp: number;
    background: string;
    mechSkills: number[];
    licenses: IRankedData[];
    skills: IRankedData[];
    talents: IRankedData[];
    core_bonuses: string[];
    reserves: IReserveData[];
    orgs: IOrganizationData[];
    loadout: IPilotLoadoutData;
    mechs: IMechData[];
    active_mech: string | null;
    cc_ver: string;
    counter_data: ICounterSaveData[];
    custom_counters: object[];
    brews: string[];
    state?: IMechState | null;
}
export class Pilot {
    private _cloudID: string;
    private _cloudOwnerID: string;
    private _lastCloudUpdate: string;
    private _cloud_portrait: string;

    private _callsign: string;
    private _name: string;
    private _player_name: string;
    private _status: string;
    private _factionID: string;
    private _text_appearance: string;
    private _notes: string;
    private _quirk: string;
    private _history: string;

    private _group: string;
    private _sortIndex: number;
    private _campaign: string;

    private _id: string;
    private _level: number;
    private _portrait: string;
    private _current_hp: number;
    private _background: string;

    private _licenses: PilotLicense[];
    private _skills: PilotSkill[];
    private _talents: PilotTalent[];
    private _core_bonuses: CoreBonus[];
    private _mechSkills: MechSkills;

    private _reserves: Reserve[];
    private _orgs: Organization[];

    private _loadout: PilotLoadout;

    private _mechs: Mech[];
    private _state: ActiveState | null;

    private cc_ver: string;
    private _brews: string[];

    public constructor() {
        this._id = uuid();
        this._cloudID = "";
        this._cloudOwnerID = "";
        this._lastCloudUpdate = "";
        this._level = 0;
        this._callsign = "";
        this._name = "";
        this._player_name = "";
        this._status = "Active";
        this._text_appearance = "";
        this._notes = "";
        this._history = "";
        this._factionID = "";
        this._portrait = "";
        this._cloud_portrait = "";
        this._quirk = "";
        this._loadout = new PilotLoadout(0);
        this._current_hp = this.MaxHP;
        this._background = "";
        this._licenses = [];
        this._skills = [];
        this._talents = [];
        this._state = null;
        this._mechSkills = new MechSkills(0, 0, 0, 0);
        this._core_bonuses = [];
        this._mechs = [];
        this._reserves = [];
        this._orgs = [];
        this._brews = [];
        this._group = "";
        this._sortIndex = 0;
        this._campaign = "";
        this.cc_ver = store.getVersion || "UNKNOWN";
        // this._initCounters()
    }

    // -- Utility -----------------------------------------------------------------------------------
    private save(): void {
        store.pilots.saveData();
    }

    public SetBrewForce(brews: string[]): void {
        this._brews = brews;
    }

    // Set the pilots brews based on which brews its frames, licenses, etc come from
    public SetBrewData(): void {
        const packs = store.compendium.ContentPacks;

        function collectBrewGroup(items: CompendiumItem[]): string[] {
            return items
                .filter(x => x != null)
                .map(i => i.Brew)
                .filter(x => x.toLowerCase() !== "core");
        }

        let brews = collectBrewGroup(this._loadout.Items);
        this._mechs.forEach(m => {
            brews = _.union(brews, collectBrewGroup([m.Frame]));
            m.Loadouts.forEach(ml => {
                brews = _.union(brews, collectBrewGroup(ml.Weapons));
                brews = _.union(brews, collectBrewGroup(ml.Systems));
            });
        });
        brews = brews.map(x => packs.find(y => y.ID === x)).map(z => `${z?.Name} @ ${z?.Version}`);
        this._brews = brews;
    }

    // Check if the lancer has any of the following "possessions"
    public has(
        feature: License | CoreBonus | Skill | CustomSkill | Talent | Reserve,
        rank?: number | null
    ): boolean {
        if (
            feature instanceof Skill ||
            feature instanceof Talent ||
            feature instanceof CustomSkill
        ) {
            let pilot_rank = this.rank(feature);
            return pilot_rank >= (rank || 1);
        } else if (feature instanceof CoreBonus) {
            return this._core_bonuses.some(x => x.ID === feature.ID);
        } else if (feature instanceof License) {
            const license = this._licenses.find(x => x.License.Name === feature.Name);
            return !!(license && license.Rank >= (rank || 0));
        } else if (feature instanceof Reserve) {
            const e = this.Reserves.find(
                x => x.ID === `reserve_${feature.ID}` || x.Name === feature.Name
            );
            return !!(e && !e.Used);
        } else {
            return false;
        }
    }

    // Get the rank of the specified skill/talent. Returns 0 if none
    public rank(feature: Skill | CustomSkill | Talent): number {
        if (feature instanceof Skill) {
            let valid = [feature.ID, feature.Name];
            let found = this._skills.find(
                x => valid.includes(x.Skill.Name) || valid.includes(x.Skill.ID)
            );
            return found?.Rank || 0;
        } else {
            let found = this._talents.find(x => x.Talent.ID === feature.ID);
            return found?.Rank || 0;
        }
    }

    // -- Attributes --------------------------------------------------------------------------------
    public get ID(): string {
        return this._id;
    }

    public RenewID(): void {
        this._id = uuid();
        this._cloudID = "";
        this.save();
    }

    public get Level(): number {
        return this._level;
    }

    public set Level(level: number) {
        this._level = level;
        this.save();
    }

    public ApplyLevel(update: IPilotData): void {
        this.setPilotData(update);
        this.save();
    }

    public get Power(): number {
        return (this.Level + 1) * 100;
    }

    public get Background(): string {
        return this._background;
    }

    public set Background(bg: string) {
        this._background = bg;
        this.save();
    }

    public get Brews(): string[] {
        return this._brews;
    }

    public get Callsign(): string {
        return this._callsign;
    }

    public set Callsign(newVal: string) {
        this._callsign = newVal;
        this.save();
    }

    public get Name(): string {
        return this._name;
    }

    public set Name(newVal: string) {
        this._name = newVal;
        this.save();
    }

    public get PlayerName(): string {
        return this._player_name;
    }

    public set PlayerName(newVal: string) {
        this._player_name = newVal;
        this.save();
    }

    public get Status(): string {
        return this._status;
    }

    public set Status(newVal: string) {
        this._status = newVal;
        this.save();
    }

    public get Faction(): Faction {
        let v = store.compendium.getReferenceByID("Factions", this._factionID);
        return v;
    }

    public set Faction(faction: Faction) {
        this._factionID = faction.ID;
        this.save();
    }

    public get HasIdent(): boolean {
        return !!(this.Name && this.Callsign);
    }

    public get TextAppearance(): string {
        return this._text_appearance;
    }

    public set TextAppearance(newVal: string) {
        this._text_appearance = newVal;
        this.save();
    }

    public get Notes(): string {
        return this._notes;
    }

    public set Notes(newVal: string) {
        this._notes = newVal;
        this.save();
    }

    public get Quirk(): string {
        return this._quirk;
    }

    public set Quirk(newVal: string) {
        this._quirk = newVal;
        this.save();
    }

    public get History(): string {
        return this._history;
    }

    public set History(_history: string) {
        this._history = _history;
        this.save();
    }

    /*
    public SetLocalImage(src: string): void {
        this._portrait = src;
        this.save();
    }

    public get LocalImage(): string {
        return this._portrait;
    }

    public get Image(): string {
        return this.Portrait;
    }

    public get Portrait(): string {
        if (this._cloud_portrait) return this._cloud_portrait;
        else if (Capacitor.platform !== "web" && this._portrait)
            returnimageManagement.getImagePath(ImageTag.Pilot, this._portrait);
        else returnimageManagement.getImagePath(ImageTag.Pilot, "nodata.png", true);
    }
    */

    // -- Cloud -------------------------------------------------------------------------------------
    public get CloudImage(): string {
        return this._cloud_portrait;
    }

    public set CloudImage(src: string) {
        this._cloud_portrait = src;
        this.save();
    }

    public get CloudID(): string {
        return this._cloudID;
    }

    public set CloudID(id: string) {
        this._cloudID = id;
        this.save();
    }

    public get CloudOwnerID(): string {
        return this._cloudOwnerID;
    }

    public set CloudOwnerID(id: string) {
        this._cloudOwnerID = id;
        this.save();
    }

    public get LastCloudUpdate(): string {
        return this._lastCloudUpdate;
    }

    public set LastCloudUpdate(id: string) {
        this._lastCloudUpdate = id;
        this.save();
    }

    public get IsUserOwned(): boolean {
        return this.CloudOwnerID === store.user.ID;
    }

    public SetCloudImage(src: string): void {
        this._cloud_portrait = src;
        this.save();
    }

    public async CloudSave(): Promise<any> {
        this.SetBrewData();
        if (!this.CloudOwnerID) {
            this.CloudOwnerID = store.user.ID;
        }
        if (!this.CloudID) {
            return gistApi.newPilot(this).then((response: any) => {
                this.setCloudInfo(response.id);
            });
        } else {
            return gistApi.savePilot(this).then((response: any) => {
                this.setCloudInfo(response.id);
            });
        }
    }

    public async CloudLoad(): Promise<any> {
        if (!this.CloudID) return Promise.reject("No Cloud ID");
        return gistApi.loadPilot(this.CloudID).then((gist: any) => {
            this.setPilotData(gist);
            this.LastCloudUpdate = new Date().toString();
        });
    }

    public CloudCopy(): Promise<any> {
        this.CloudID = "";
        this.CloudOwnerID = "";
        return this.CloudSave();
    }

    public setCloudInfo(id: string): void {
        this.CloudID = id;
        this.CloudOwnerID = store.user.ID;
        this.LastCloudUpdate = new Date().toString();
    }

    // -- Stats -------------------------------------------------------------------------------------
    public get Grit(): number {
        return Math.ceil(this._level / 2);
    }

    public get MaxHP(): number {
        let health = Rules.BasePilotHP + this.Grit;
        this.Loadout.Armor.forEach(x => {
            if (x) health += x.HPBonus;
        });
        return health;
    }

    public get CurrentHP(): number {
        return this._current_hp;
    }

    public set CurrentHP(hp: number) {
        if (hp > this.MaxHP) this._current_hp = this.MaxHP;
        else if (hp < 0) this._current_hp = 0;
        else this._current_hp = hp;

        if (this._current_hp === 0) {
            this.Status = "KIA";
        }

        this.save();
    }

    public Heal(): void {
        this.CurrentHP = this.MaxHP;
    }

    public get Armor(): number {
        let armor = 0;
        this.Loadout.Armor.forEach(x => {
            if (x) armor += x.Armor;
        });
        return armor;
    }

    public get Speed(): number {
        let speed = Rules.BasePilotSpeed;
        this.Loadout.Armor.forEach(x => {
            if (!x) return;
            if (x.Speed) speed = x.Speed;
            speed += x.SpeedBonus;
        });
        return speed;
    }

    public get Evasion(): number {
        let evasion = Rules.BasePilotEvasion;
        this.Loadout.Armor.forEach(x => {
            if (!x) return;
            if (x.Evasion) evasion = x.Evasion;
            evasion += x.EvasionBonus;
        });
        return evasion;
    }

    public get EDefense(): number {
        let edef = Rules.BasePilotEdef;
        this.Loadout.Armor.forEach(x => {
            if (!x) return;
            if (x.EDefense) edef = x.EDefense;
            edef += x.EDefenseBonus;
        });
        return edef;
    }

    //TODO: collect passives, eg:
    public get LimitedBonus(): number {
        let bonus = Math.floor(this.MechSkills.Eng / 2);
        if (this._core_bonuses.find(x => x.ID === "cb_integrated_ammo_feeds")) {
            bonus += 2;
        }
        return bonus;
    }

    public get AICapacity(): number {
        let tlos = store.compendium.getReferenceByID("CoreBonuses", "cb_the_lesson_of_shaping");
        return this.has(tlos) ? 2 : 1;
    }

    // -- Skills ------------------------------------------------------------------------------------
    public get Skills(): PilotSkill[] {
        return this._skills;
    }

    public set Skills(skills: PilotSkill[]) {
        this._skills = skills;
        this.save();
    }

    public get CurrentSkillPoints(): number {
        return this._skills.reduce((sum, skill) => sum + skill.Rank, 0);
    }

    public get MaxSkillPoints(): number {
        const bonus = this.Reserves.filter(x => x.ID === "reserve_skill").length;
        return Rules.MinimumPilotSkills + this._level + bonus;
    }

    public get IsMissingSkills(): boolean {
        return this.CurrentSkillPoints < this.MaxSkillPoints;
    }

    public get TooManySkills(): boolean {
        return this.CurrentSkillPoints > this.MaxSkillPoints;
    }

    public get HasFullSkills(): boolean {
        return this.CurrentSkillPoints === this.MaxSkillPoints;
    }

    public CanAddSkill(skill: Skill | CustomSkill): boolean {
        if (this._level === 0) {
            return this._skills.length < Rules.MinimumPilotSkills && !this.has(skill);
        } else {
            const underLimit = this.CurrentSkillPoints < this.MaxSkillPoints;
            if (!this.has(skill) && underLimit) return true;
            const pSkill = this._skills.find(x => x.Skill.ID === skill.ID);
            if (underLimit && pSkill && pSkill.Rank < Rules.MaxTriggerRank) {
                return true;
            }
            return false;
        }
    }

    public AddSkill(skill: Skill | CustomSkill): void {
        const index = this._skills.findIndex(x => _.isEqual(x.Skill, skill));
        if (index === -1) {
            this._skills.push(new PilotSkill(skill));
        } else {
            this._skills[index].Increment();
        }
        this.save();
    }

    public AddCustomSkill(cs: { skill: string; description: string; detail: string }): void {
        this.AddSkill(new CustomSkill(cs.skill, cs.description, cs.detail));
    }

    public CanRemoveSkill(skill: Skill | CustomSkill): boolean {
        return this.has(skill);
    }

    public RemoveSkill(skill: Skill | CustomSkill): void {
        const index = this._skills.findIndex(x => x.Skill.ID === skill.ID);
        if (index === -1) {
            console.error(
                `Skill Trigger "${skill.Name}" does not exist on Pilot ${this._callsign}`
            );
        } else {
            if (this._skills[index].Rank > 1) {
                this._skills[index].Decrement();
            } else {
                this._skills.splice(index, 1);
            }
        }
        this.save();
    }

    public ClearSkills(): void {
        for (let i = this._skills.length - 1; i >= 0; i--) {
            while (this._skills[i]) {
                this.RemoveSkill(this._skills[i].Skill);
            }
        }
    }

    // -- Talents -----------------------------------------------------------------------------------
    public get Talents(): PilotTalent[] {
        return this._talents;
    }

    public set Talents(talents: PilotTalent[]) {
        this._talents = talents;
        this.save();
    }

    public get CurrentTalentPoints(): number {
        return this._talents.reduce((sum, talent) => sum + talent.Rank, 0);
    }

    public get MaxTalentPoints(): number {
        return Rules.MinimumPilotTalents + this._level;
    }

    public get IsMissingTalents(): boolean {
        return this.CurrentTalentPoints < this.MaxTalentPoints;
    }

    public get TooManyTalents(): boolean {
        return this.CurrentTalentPoints > this.MaxTalentPoints;
    }

    public get HasFullTalents(): boolean {
        return this.CurrentTalentPoints === this.MaxTalentPoints;
    }

    public getTalentRank(id: string): number {
        const index = this._talents.findIndex(x => x.Talent.ID === id);
        return index > -1 ? this._talents[index].Rank : 0;
    }

    public AddTalent(talent: Talent): void {
        const index = this._talents.findIndex(x => _.isEqual(x.Talent, talent));
        if (index === -1) {
            this._talents.push(new PilotTalent(talent));
        } else {
            this._talents[index].Increment();
        }
        this.talentSort();
        this.updateIntegratedTalents();
        this.save();
    }

    public RemoveTalent(talent: Talent): void {
        const index = this._talents.findIndex(x => _.isEqual(x.Talent, talent));
        if (index === -1) {
            console.error(`Talent "${talent.Name}" does not exist on Pilot ${this._callsign}`);
        } else {
            if (this._talents[index].Rank > 1) {
                this._talents[index].Decrement();
            } else {
                this._talents.splice(index, 1);
            }
        }
        this.talentSort();
        this.updateIntegratedTalents();
        this.save();
    }

    public ClearTalents(): void {
        for (let i = this._talents.length - 1; i >= 0; i--) {
            while (this._talents[i]) {
                this.RemoveTalent(this._talents[i].Talent);
            }
        }
    }

    private talentSort(): void {
        this._talents = this._talents.sort(function(a, b) {
            return a.Rank === b.Rank ? 0 : a.Rank > b.Rank ? -1 : 1;
        });
    }

    private updateIntegratedTalents(): void {
        this._mechs.forEach(mech => {
            mech.UpdateLoadouts();
        });
    }

    public get TalentActions(): IAction[] {
        let talent_actions: IAction[] = [];
        for (let talent of this._talents) {
            for (let rank of talent.UnlockedRanks) {
                let as = rank.actions;
                if(as) talent_actions.push(...as);
            }
        }
        return talent_actions;
    }

    // -- Core Bonuses ------------------------------------------------------------------------------
    public get CoreBonuses(): CoreBonus[] {
        return this._core_bonuses;
    }

    public set CoreBonuses(coreBonuses: CoreBonus[]) {
        this._core_bonuses = coreBonuses;
        this.save();
    }

    public get CurrentCBPoints(): number {
        return this._core_bonuses.length;
    }

    public get MaxCBPoints(): number {
        return Math.floor(this._level / 3);
    }

    public get IsMissingCBs(): boolean {
        return this.CurrentCBPoints < this.MaxCBPoints;
    }

    public get TooManyCBs(): boolean {
        return this.CurrentCBPoints > this.MaxCBPoints;
    }

    public get HasCBs(): boolean {
        return this.CurrentCBPoints === this.MaxCBPoints;
    }

    public AddCoreBonus(coreBonus: CoreBonus): void {
        this._core_bonuses.push(coreBonus);
        this.save();
    }

    public RemoveCoreBonus(coreBonus: CoreBonus): void {
        const index = this._core_bonuses.findIndex(x => _.isEqual(coreBonus, x));
        if (index === -1) {
            console.error(
                `CORE Bonus "${coreBonus.Name}" does not exist on Pilot ${this._callsign}`
            );
        } else {
            this._core_bonuses.splice(index, 1);
            this.removeCoreBonuses(coreBonus);
        }
        this.save();
    }

    public ClearCoreBonuses(): void {
        for (let i = this._core_bonuses.length - 1; i >= 0; i--) {
            this.RemoveCoreBonus(this._core_bonuses[i]);
        }
    }

    private removeCoreBonuses(coreBonus: CoreBonus): void {
        this._mechs.forEach(mech => {
            mech.Loadouts.forEach(loadout => {
                if (coreBonus.ID === "cb_mount_retrofitting") loadout.RemoveRetrofitting();
                if (coreBonus.ID === "cb_improved_armament") loadout.ImprovedArmamentMount.Clear();
                if (coreBonus.ID === "cb_integrated_weapon") loadout.IntegratedWeaponMount.Clear();
                loadout.AllEquippableMounts(true).forEach(mount => {
                    mount.RemoveCoreBonus(coreBonus);
                });
            });
        });
    }

    // -- Licenses ----------------------------------------------------------------------------------
    public get Licenses(): PilotLicense[] {
        return this._licenses;
    }

    public set Licenses(licenses: PilotLicense[]) {
        this._licenses = licenses;
        this.save();
    }

    public LicenseLevel(manufacturerID: string): number {
        return this.Licenses.filter(
            x => x.License.Source.toLowerCase() === manufacturerID.toLowerCase()
        ).reduce((a, b) => +a + +b.Rank, 0);
    }

    public get CurrentLicensePoints(): number {
        return this._licenses.reduce((sum, license) => sum + license.Rank, 0);
    }

    public get MaxLicensePoints(): number {
        return this._level;
    }

    public get IsMissingLicenses(): boolean {
        return this.CurrentLicensePoints < this.MaxLicensePoints;
    }

    public get TooManyLicenses(): boolean {
        return this.CurrentLicensePoints > this.MaxLicensePoints;
    }

    public get HasLicenses(): boolean {
        return this.CurrentLicensePoints === this.MaxLicensePoints;
    }

    public getLicenseRank(_name: string): number {
        const index = this._licenses.findIndex(x => x.License.Name === _name);
        return index > -1 ? this._licenses[index].Rank : 0;
    }

    public AddLicense(license: License): void {
        const index = this._licenses.findIndex(x => _.isEqual(x.License, license));
        if (index === -1) {
            this._licenses.push(new PilotLicense(license, 1));
        } else {
            this._licenses[index].Increment();
        }
        this.save();
    }

    public RemoveLicense(license: License): void {
        const index = this._licenses.findIndex(x => _.isEqual(x.License, license));
        if (index === -1) {
            console.error(
                `License "${license.ToString()}" does not exist on Pilot ${this._callsign}`
            );
        } else {
            if (this._licenses[index].Rank > 1) {
                this._licenses[index].Decrement();
            } else {
                this._licenses.splice(index, 1);
            }
        }
        this.save();
    }

    public ClearLicenses(): void {
        for (let i = this._licenses.length - 1; i >= 0; i--) {
            while (this._licenses[i]) {
                this.RemoveLicense(this._licenses[i].License);
            }
        }
    }

    // -- Mech Skills -------------------------------------------------------------------------------
    public get MechSkills(): MechSkills {
        return this._mechSkills;
    }

    public set MechSkills(mechskills: MechSkills) {
        this._mechSkills = mechskills;
        this.save();
    }

    public resetHASE(): void {
        this._mechSkills.Reset();
    }

    public get CurrentHASEPoints(): number {
        return this._mechSkills.Sum;
    }

    public get MaxHASEPoints(): number {
        return Rules.MinimumMechSkills + this._level;
    }

    public get IsMissingHASE(): boolean {
        return this.CurrentHASEPoints < this.MaxHASEPoints;
    }

    public get TooManyHASE(): boolean {
        return this.CurrentHASEPoints > this.MaxHASEPoints;
    }

    public get HasFullHASE(): boolean {
        return this.CurrentHASEPoints === this.MaxHASEPoints;
    }

    // -- Downtime Reserves -------------------------------------------------------------------------
    public get Reserves(): Reserve[] {
        return this._reserves;
    }

    public set Reserves(reserves: Reserve[]) {
        this._reserves = reserves;
        this.save();
    }

    public RemoveReserve(index: number): void {
        this._reserves.splice(index, 1);
        this.save();
    }

    public get Organizations(): Organization[] {
        return this._orgs;
    }

    public set Organizations(orgs: Organization[]) {
        this._orgs = orgs;
        this.save();
    }

    public RemoveOrganization(index: number): void {
        this._orgs.splice(index, 1);
        this.save();
    }

    // -- Loadouts ----------------------------------------------------------------------------------
    public get Loadout(): PilotLoadout {
        return this._loadout;
    }

    public set Loadout(l: PilotLoadout) {
        this._loadout = l;
        this.save();
    }

    // -- Mechs -----------------------------------------------------------------------------------
    public get Mechs(): Mech[] {
        return this._mechs;
    }

    public AddMech(mech: Mech): void {
        this._mechs.push(mech);
        this.save();
    }

    public RemoveMech(mech: Mech): void {
        const index = this._mechs.findIndex(x => _.isEqual(x, mech));
        if (index === -1) {
            console.error(`Loadout "${mech.Name}" does not exist on Pilot ${this._callsign}`);
        } else {
            this._mechs.splice(index, 1);
        }
        this.save();
    }

    public CloneMech(mech: Mech): void {
        const mechData = Mech.Serialize(mech);
        const clone = Mech.Deserialize(mechData, this);
        clone.RenewID();
        clone.Name += "*";
        clone.IsActive = false;
        this._mechs.push(clone);
        this.save();
    }

    
    // Controls the active state. Due to volatility, you should always route methods through the State getter
    public set ActiveMech(mech: Mech | null) {
        if(mech) {
            this._state = new ActiveState(this);
        } else {
            this._state = null;
        }
    }

    // -- COUNTERS ----------------------------------------------------------------------------------

    private _counterSaveData: ICounterSaveData[] = [];
    public get CounterSaveData(): ICounterSaveData[] {
        return this._counterSaveData;
    }
    public saveCounter(inputData: ICounterSaveData): void {
        const index = this._counterSaveData.findIndex(datum => datum.id === inputData.id);
        if (index < 0) {
            this._counterSaveData = [...this._counterSaveData, inputData];
        } else {
            this._counterSaveData[index] = inputData;
            this._counterSaveData = [...this._counterSaveData];
        }
        this.save();
    }

    private _customCounters: ICounterData[] = [];
    public get CustomCounterData(): ICounterData[] {
        return this._customCounters || [];
    }

    public createCustomCounter(name: string): void {
        const counter = {
            name,
            id: uuid(),
            custom: true,
        };
        this._customCounters = [...this._customCounters, counter];
        this.save();
    }

    public deleteCustomCounter(id: string): void {
        const index = this._customCounters.findIndex(c => c.custom && c.id === id);
        if (index > -1) {
            this._customCounters.splice(index, 1);
            this._customCounters = [...this._customCounters];
        }
        this.save();
    }

    public get CounterData(): ICounterData[] {
        return [
            this.Talents?.flatMap(pilotTalent =>
                pilotTalent.Talent.Counters.filter(x => !x.level || x.level <= pilotTalent.Rank)
            ),
            this.CoreBonuses?.flatMap(cb => cb.Counters),
            this.ActiveMech?.Frame.Counters,
            this.ActiveMech?.ActiveLoadout?.Systems.flatMap(system => system.Counters),
            this.ActiveMech?.ActiveLoadout?.Weapons.flatMap(weapon => [
                ...weapon.Counters,
                ...(weapon.Mod?.Counters || []),
            ]),
            this.ActiveMech?.Frame.CoreSystem.Integrated?.Counters,
            this.CustomCounterData,
        ]
            .flat()
            .filter(x => x) as ICounterData[];
    }

    // -- Organization ------------------------------------------------------------------------------
    public get Group(): string {
        return this._group;
    }

    public set Group(val: string) {
        this._group = val;
        this.save();
    }

    public get SortIndex(): number {
        return this._sortIndex;
    }

    public set SortIndex(val: number) {
        this._sortIndex = val;
        this.save();
    }

    public get Campaign(): string {
        return this._campaign;
    }

    public set Campaign(val: string) {
        this._campaign = val;
        this.save();
    }

      // -- Active Mode -------------------------------------------------------------------------------
    public get Actions(): IAction[] {
        return this.TalentActions
    }

    public get State(): ActiveState | null {
        return this._state;
    }



    // -- I/O ---------------------------------------------------------------------------------------
    public static Serialize(p: Pilot): IPilotData {
        return {
            id: p.ID,
            campaign: p.Campaign,
            group: p.Group,
            sort_index: p.SortIndex,
            cloudID: p.CloudID,
            cloudOwnerID: p.CloudOwnerID,
            lastCloudUpdate: p.LastCloudUpdate,
            level: p.Level,
            callsign: p.Callsign,
            name: p.Name,
            player_name: p.PlayerName,
            status: p.Status,
            factionID: p._factionID,
            text_appearance: p.TextAppearance,
            notes: p.Notes,
            history: p.History,
            portrait: p._portrait,
            cloud_portrait: p._cloud_portrait,
            quirk: p.Quirk,
            current_hp: p.CurrentHP,
            reserves: p.Reserves.length ? p.Reserves.map(x => Reserve.Serialize(x)) : [],
            orgs: p.Organizations.length ? p.Organizations.map(x => Organization.Serialize(x)) : [],
            background: p.Background,
            mechSkills: MechSkills.Serialize(p.MechSkills),
            licenses: p.Licenses.map(x => PilotLicense.Serialize(x)),
            skills: p.Skills.map(x => PilotSkill.Serialize(x)),
            talents: p.Talents.map(x => PilotTalent.Serialize(x)),
            core_bonuses: p.CoreBonuses.map(x => x.ID),
            loadout: PilotLoadout.Serialize(p.Loadout),
            mechs: p.Mechs.length ? p.Mechs.map(x => Mech.Serialize(x)) : [],
            active_mech: p.ActiveMech ? p.ActiveMech.ID : null,
            cc_ver: p.cc_ver,
            counter_data: p.CounterSaveData,
            custom_counters: p.CustomCounterData,
            brews: p._brews || [],
            state: p.State ? ActiveState.Serialize(p.State) : null
        };
    }

    public static Deserialize(pilotData: IPilotData): Pilot {
        const p = new Pilot();
        p.setPilotData(pilotData);
        return p;
    }

    private setPilotData(data: IPilotData): void {
        this._campaign = data.campaign || "";
        this._group = data.group || "";
        this._sortIndex = data.sort_index || 0;
        this._cloudID = data.cloudID || "";
        this._cloudOwnerID = data.cloudOwnerID || "";
        this._lastCloudUpdate = data.lastCloudUpdate || "";
        this._id = data.id;
                this._loadout = data.loadout ? PilotLoadout.Deserialize(data.loadout) : new PilotLoadout(0)
    this._state = data.state ? ActiveState.Deserialize(this, data.state) : new ActiveState(this)
        this._level = data.level;
        this._callsign = data.callsign;
        this._name = data.name;
        this._player_name = data.player_name;
        this._status = data.status || "ACTIVE";
        this._factionID = data.factionID;
        this._text_appearance = data.text_appearance;
        this._notes = data.notes;
        this._history = data.history;
        this._portrait = data.portrait;
        this._cloud_portrait = data.cloud_portrait;
        this._quirk = data.quirk;
        this._current_hp = data.current_hp;
        this._background = data.background;
        this._mechSkills = MechSkills.Deserialize(data.mechSkills);
        this._licenses = data.licenses.map((x: IRankedData) => PilotLicense.Deserialize(x));
        this._skills = data.skills.map((x: IRankedData) => PilotSkill.Deserialize(x));
        this._talents = data.talents.map((x: IRankedData) => PilotTalent.Deserialize(x));
        this._core_bonuses = data.core_bonuses.map((x: string) => CoreBonus.Deserialize(x));
        this._reserves = data.reserves
            ? data.reserves.map((x: IReserveData) => Reserve.Deserialize(x))
            : [];
        this._orgs = data.orgs
            ? data.orgs.map((x: IOrganizationData) => Organization.Deserialize(x))
            : [];
        this._mechs = data.mechs.length
            ? data.mechs.map((x: IMechData) => Mech.Deserialize(x, this))
            : [];
        this.cc_ver = data.cc_ver || "";
        this._counterSaveData = data.counter_data || [];
        this._customCounters = (data.custom_counters as ICounterData[]) || [];
        this._brews = data.brews || [];
    }
}
