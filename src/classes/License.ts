import _ from "lodash";
import { LicensedItem, Frame, Manufacturer } from "@/class";
import { store } from "@/hooks";

export class License {
    private _frame_id: string;
    private _source: string;
    private _name: string;
    private _unlocks: LicensedItem[][];
    private _brew: string;

    public constructor(frame: Frame) {
        this._frame_id = frame.ID;
        this._source = frame.Source;
        this._name = frame.Name;
        this._brew = frame.Brew || "Core";

        this._unlocks = [[], [], []];
        this.updateUnlocks();
    }

    public updateUnlocks() {
        let frame = store.compendium.getReferenceByIDCareful("Frames", this._frame_id);
        if (!frame) {
            return;
        }
        const items: LicensedItem[] = _.cloneDeep([
            ...store.compendium.getItemCollection("MechWeapons"),
            ...store.compendium.getItemCollection("WeaponMods"),
            ...store.compendium.getItemCollection("MechSystems"),
        ]).filter(
            (x: LicensedItem) => x.License.toUpperCase() === frame!.Name.toUpperCase()
        ) as LicensedItem[];

        this._unlocks = [
            items.filter(x => x.LicenseLevel === 1),
            items.filter(x => x.LicenseLevel === 2),
            items.filter(x => x.LicenseLevel === 3),
        ];

        // add frame unlock as the first item of LL2
        if (frame.LicenseLevel) this._unlocks[frame.LicenseLevel - 1].unshift(frame);
    }

    public get Name(): string {
        return this._name;
    }

    public get Source(): string {
        return this._source;
    }

    public get Manufacturer(): Manufacturer {
        return store.compendium.getReferenceByID("Manufacturers", this._source);
    }

    public get FrameID(): string {
        return this._frame_id;
    }

    public get Brew(): string {
        return this._brew;
    }

    public get Unlocks(): LicensedItem[][] {
        return this._unlocks;
    }

    public UnlockByRank(rank: number): LicensedItem[] {
        return this._unlocks[rank - 1];
    }

    public ToString(): string {
        return `${this._source} ${this._name}`;
    }

    public static Deserialize(frameId: string): License {
        return new License(store.compendium.getReferenceByID("Frames", frameId));
    }
}
