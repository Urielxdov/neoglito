import { Module } from "@nestjs/common";
import { PortController } from "./presentation/port.controller.js";
import { ContainerModule } from "../container/container.module.js";
import { CacheModule } from "../shared/infrastructure/cache/cache.module.js";
import { CACHE_PORT } from "../shared/application/cache.port.js";
import { FILE_FINDER_PORT } from "../shared/application/file-finder.port.js";
import { RedisCache } from "../shared/infrastructure/cache/redis-cache.service.js";
import { RecursiveFileFinderService } from "../shared/infrastructure/files/recursive-file-finder.service.js";


@Module({
    imports: [CacheModule, ContainerModule],
    controllers: [PortController],
    providers: [
        {
            provide: CACHE_PORT,
            useClass: RedisCache
        },
        RecursiveFileFinderService,
        {
            provide: FILE_FINDER_PORT,
            useExisting: RecursiveFileFinderService,
        }
    ]
})

export class PortModule {}
