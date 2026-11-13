import { WritableSignal, computed, inject, signal } from '@angular/core';
import { translate } from '@jsverse/transloco';
import { marker } from '@jsverse/transloco-keys-manager/marker';
import { MaterialInput } from '../../../../lib/chemistry';
import { ApiResourceFactory } from '../../core/api-resource.service';
import { Additive, Material } from '../../core/models';
import { folded } from '../../shared/library-info';
import { Notices } from '../../shared/notices';

// The lists the recipe page adds from: the potter's own materials and additives, and the standard ones.
// Each is fetched once; one that fails says so once, on the page's notices, and can be asked for again.

/**
 * Fills a list, or says it could not: failure is the key of the message.
 * A list that can be asked for again keeps whether it failed, and says so once;
 * fetched on a later try, its message goes. Whether the list arrived.
 */
export async function fetchList<T>(
  notices: Notices,
  request: Promise<T[]>,
  target: { set(value: T[]): void },
  failure: string,
  failed?: WritableSignal<boolean>
): Promise<boolean> {
  try {
    target.set(await request);
    if (failed?.()) {
      const message = translate(failure);
      notices.errors.update((list) => list.filter((text) => text !== message));
    }
    failed?.set(false);
    return true;
  } catch {
    if (!failed?.()) notices.error(translate(failure));
    failed?.set(true);
    return false;
  }
}

export class RecipeLibraries {
  private readonly materials = inject(ApiResourceFactory).for<Material>('materials');
  private readonly additives = inject(ApiResourceFactory).for<Additive>('additives');

  /** What could not be fetched is said on these: the page's notices. */
  constructor(private readonly notices: Notices) {}

  readonly myMaterials = signal<Material[]>([]);
  readonly standardMaterials = signal<Material[]>([]);
  readonly myAdditives = signal<Additive[]>([]);
  readonly standardAdditives = signal<Additive[]>([]);
  /** The standard lists could not be fetched: the lists say so, and offer to try again. */
  readonly standardMaterialsFailed = signal(false);
  readonly standardAdditivesFailed = signal(false);
  /** The account's own lists that could not be fetched: the page offers to try again. */
  readonly myMaterialsFailed = signal(false);
  readonly myAdditivesFailed = signal(false);
  readonly mineFailed = computed(() => this.myMaterialsFailed() || this.myAdditivesFailed());

  /** Fetches each list: the potter's own materials, the standard ones, then the additives the same. */
  load(): void {
    this.loadMyMaterials();
    this.loadStandardMaterials();
    this.loadMyAdditives();
    this.loadStandardAdditives();
  }

  /** Asks again for each of the potter's own lists that could not be fetched. */
  retryMine(): void {
    if (this.myMaterialsFailed()) this.loadMyMaterials();
    if (this.myAdditivesFailed()) this.loadMyAdditives();
  }

  loadStandardMaterials(): void {
    void fetchList(
      this.notices,
      this.materials.getStandard(),
      this.standardMaterials,
      marker('recipe.page.fetchStandardMaterials'),
      this.standardMaterialsFailed
    );
  }

  loadStandardAdditives(): void {
    void fetchList(
      this.notices,
      this.additives.getStandard(),
      this.standardAdditives,
      marker('recipe.page.fetchStandardAdditives'),
      this.standardAdditivesFailed
    );
  }

  /** A material or additive by its name or one of its aliases, for one that borrows another's chemistry. */
  findByName(name: string): MaterialInput | undefined {
    const wanted = folded(name.trim());
    const records = [
      ...this.standardAdditives(),
      ...this.myAdditives(),
      ...this.standardMaterials(),
      ...this.myMaterials()
    ];
    return records.find(
      (record) => folded(record.name) === wanted || (record.aliases ?? []).some((alias) => folded(alias) === wanted)
    );
  }

  private loadMyMaterials(): void {
    void fetchList(
      this.notices,
      this.materials.getAll(),
      this.myMaterials,
      marker('recipe.page.fetchMaterials'),
      this.myMaterialsFailed
    );
  }

  private loadMyAdditives(): void {
    void fetchList(
      this.notices,
      this.additives.getAll(),
      this.myAdditives,
      marker('recipe.page.fetchAdditives'),
      this.myAdditivesFailed
    );
  }
}
