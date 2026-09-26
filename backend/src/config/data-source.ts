import 'reflect-metadata';
import path from 'node:path';
import { DataSource } from 'typeorm';
import { db, dbSsl, env } from './env';
import { Category } from '../entities/Category';
import { DeliveryZone } from '../entities/DeliveryZone';
import { Order } from '../entities/Order';
import { OrderItem } from '../entities/OrderItem';
import { PlatformSettings } from '../entities/PlatformSettings';
import { Product } from '../entities/Product';
import { Store } from '../entities/Store';
import { Subscription } from '../entities/Subscription';
import { SubscriptionPayment } from '../entities/SubscriptionPayment';
import { SubscriptionRequest } from '../entities/SubscriptionRequest';
import { User } from '../entities/User';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: db.host,
  port: db.port,
  username: db.username,
  password: db.password,
  database: db.database,
  ssl: dbSsl,
  // Schema changes go through migrations only — never auto-sync a database holding orders.
  synchronize: false,
  logging: env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  entities: [User, Store, Subscription, SubscriptionPayment, SubscriptionRequest, PlatformSettings, Category, Product, DeliveryZone, Order, OrderItem],
  migrations: [path.join(__dirname, '../migrations/*.{ts,js}')],
});
