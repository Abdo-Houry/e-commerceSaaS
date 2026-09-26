import type { z } from 'zod';
import type { DeliveryZoneDto, deliveryZoneInputSchema, deliveryZoneUpdateSchema } from '@matjari/shared';
import { AppDataSource } from '../config/data-source';
import { DeliveryZone } from '../entities/DeliveryZone';
import { Store } from '../entities/Store';
import { toDeliveryZoneDto } from '../utils/dto';
import { revalidateStorefront } from '../utils/revalidate';
import { scopedRepo } from '../utils/scoped-repo';

type ZoneInput = z.output<typeof deliveryZoneInputSchema>;
type ZoneUpdate = z.output<typeof deliveryZoneUpdateSchema>;

async function revalidate(storeId: string) {
  const store = await AppDataSource.getRepository(Store).findOne({ where: { id: storeId }, select: { slug: true } });
  revalidateStorefront(store?.slug);
}

export async function listZones(storeId: string): Promise<DeliveryZoneDto[]> {
  const zones = await scopedRepo(DeliveryZone, storeId).find({ order: { sortOrder: 'ASC', createdAt: 'ASC' } });
  return zones.map(toDeliveryZoneDto);
}

export async function createZone(storeId: string, input: ZoneInput): Promise<DeliveryZoneDto> {
  const repo = scopedRepo(DeliveryZone, storeId);
  const last = await repo.findOne({ where: {}, order: { sortOrder: 'DESC' } });
  const zone = await repo.save(repo.create({ ...input, sortOrder: (last?.sortOrder ?? -1) + 1 }));
  void revalidate(storeId);
  return toDeliveryZoneDto(zone);
}

export async function updateZone(storeId: string, id: string, input: ZoneUpdate): Promise<DeliveryZoneDto> {
  const repo = scopedRepo(DeliveryZone, storeId);
  const zone = await repo.findOneOrFail(id);
  Object.assign(zone, input);
  await repo.save(zone);
  void revalidate(storeId);
  return toDeliveryZoneDto(zone);
}

/** Past orders keep their frozen `zoneName` and fee; the FK is set to NULL. */
export async function deleteZone(storeId: string, id: string): Promise<void> {
  await scopedRepo(DeliveryZone, storeId).delete(id);
  void revalidate(storeId);
}
