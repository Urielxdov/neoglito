import { serviceTone } from "@neoglito/web/components/repositories/analyze-service-tone"

export interface AnalyzeRelationsService {
  key: string
  name: string
  repositoryName: string
  status: string
  health: string
}

interface AnalyzeRelationsPlaceholderProps {
  services: AnalyzeRelationsService[]
}

export function AnalyzeRelationsPlaceholder({
  services,
}: AnalyzeRelationsPlaceholderProps) {
  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[#e6eaf0] bg-white shadow-[0_24px_60px_-20px_rgba(15,30,55,0.45),0_8px_22px_-12px_rgba(15,30,55,0.25)] dark:border-[#253044] dark:bg-[#111826] dark:shadow-[0_24px_60px_-20px_rgba(0,0,0,0.7)]">
      <div className="flex flex-col gap-1 border-b border-[#e6eaf0] px-[22px] py-[18px] dark:border-[#253044]">
        <span className="text-[15.5px] font-semibold text-[#16202e] dark:text-[#e8edf6]">
          Relaciones entre contenedores
        </span>
        <span className="text-[12.5px] leading-[1.5] text-[#8c98ac] dark:text-[#7a8699]">
          Aún no rastreamos qué servicio llama a cuál endpoint, así que no
          podemos dibujar las conexiones reales todavía.
        </span>
      </div>

      {services.length === 0 ? (
        <div className="flex h-full min-h-[220px] items-center justify-center px-6 py-10 text-center text-[13px] text-[#8c98ac] dark:text-[#7a8699]">
          Cuando el despliegue termine, los contenedores aparecerán aquí.
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3 px-[22px] py-[22px]">
          {services.map((service) => {
            const tone = serviceTone(service.status, service.health)

            return (
              <div
                key={service.key}
                className="flex flex-col gap-2 rounded-lg border border-[#e0e6ef] bg-[#f8fafc] px-3.5 py-3 dark:border-[#253044] dark:bg-[#0c121d]"
              >
                <span className="flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className={`block h-[8px] w-[8px] shrink-0 rounded-full ${tone.dotClassName}`}
                  />
                  <span className="min-w-0 flex-1 truncate text-[13.5px] font-semibold text-[#16202e] dark:text-[#e8edf6]">
                    {service.name}
                  </span>
                </span>
                <span className="truncate font-mono text-[12px] text-[#8c98ac] dark:text-[#7a8699]">
                  {service.repositoryName}
                </span>
                <span
                  className={`inline-flex h-[20px] w-fit items-center whitespace-nowrap rounded-full px-2 text-[11px] font-semibold ${tone.textClassName} ${tone.bgClassName}`}
                >
                  {tone.label}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
