import { useState } from 'react'
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
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const selected = services.find((service) => service.key === selectedKey) ?? null

  return (
    <div className="flex flex-1 flex-wrap items-start gap-[18px]">
      <section className="min-w-0 flex-[2_1_600px] overflow-hidden rounded-2xl border border-[#e6eaf0] bg-white shadow-[0_24px_60px_-20px_rgba(15,30,55,0.45),0_8px_22px_-12px_rgba(15,30,55,0.25)] dark:border-[#253044] dark:bg-[#111826] dark:shadow-[0_24px_60px_-20px_rgba(0,0,0,0.7)]">
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
          <div
            onClick={() => setSelectedKey(null)}
            className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3 bg-[radial-gradient(#e6eaf0_1px,transparent_1px)] [background-size:22px_22px] px-[22px] py-[22px] dark:bg-[radial-gradient(#253044_1px,transparent_1px)]"
          >
            {services.map((service) => {
              const tone = serviceTone(service.status, service.health)
              const isSelected = service.key === selectedKey

              return (
                <button
                  key={service.key}
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    setSelectedKey(isSelected ? null : service.key)
                  }}
                  className={`flex flex-col gap-2 rounded-lg border px-3.5 py-3 text-left transition-colors ${
                    isSelected
                      ? 'border-[#2257c4] bg-[#eef3fc] dark:border-[#5b8df5] dark:bg-[#18243a]'
                      : 'border-[#e0e6ef] bg-[#f8fafc] dark:border-[#253044] dark:bg-[#0c121d]'
                  }`}
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
                </button>
              )
            })}
          </div>
        )}
      </section>

      <aside className="max-w-[440px] min-w-0 flex-[1_1_320px] overflow-hidden rounded-2xl border border-[#e6eaf0] bg-white shadow-[0_24px_60px_-20px_rgba(15,30,55,0.45),0_8px_22px_-12px_rgba(15,30,55,0.25)] dark:border-[#253044] dark:bg-[#111826] dark:shadow-[0_24px_60px_-20px_rgba(0,0,0,0.7)]">
        {selected === null ? (
          <div className="flex flex-col items-center gap-2 px-[26px] py-10 text-center">
            <span className="text-[14px] font-semibold text-[#16202e] dark:text-[#e8edf6]">
              Selecciona un contenedor
            </span>
            <span className="max-w-[260px] text-[13px] leading-[1.5] text-[#8c98ac] dark:text-[#7a8699]">
              Verás sus datos y, más adelante, los endpoints que consulta y
              quién lo consulta.
            </span>
          </div>
        ) : (
          <div className="flex flex-col">
            <div className="flex items-center gap-3 border-b border-[#e6eaf0] px-[22px] py-[18px] dark:border-[#253044]">
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-semibold text-[#16202e] dark:text-[#e8edf6]">
                  {selected.name}
                </span>
                <span className="block truncate font-mono text-[12px] text-[#8c98ac] dark:text-[#7a8699]">
                  {selected.repositoryName}
                </span>
              </span>
              <span
                className={`inline-flex h-[22px] shrink-0 items-center whitespace-nowrap rounded-full px-2.5 text-[11.5px] font-semibold ${serviceTone(selected.status, selected.health).textClassName} ${serviceTone(selected.status, selected.health).bgClassName}`}
              >
                {serviceTone(selected.status, selected.health).label}
              </span>
            </div>
            <div className="flex flex-col gap-[22px] px-[22px] py-[22px]">
              <div className="flex flex-col gap-2.5">
                <span className="text-[12px] font-bold uppercase tracking-[0.09em] text-[#51607a] dark:text-[#a7b4c8]">
                  Consulta a
                </span>
                <span className="text-[12.5px] text-[#aab3c2] dark:text-[#5f6b7e]">
                  Aún no registramos las llamadas salientes de este servicio.
                </span>
              </div>
              <div className="flex flex-col gap-2.5">
                <span className="text-[12px] font-bold uppercase tracking-[0.09em] text-[#51607a] dark:text-[#a7b4c8]">
                  Lo consultan
                </span>
                <span className="text-[12.5px] text-[#aab3c2] dark:text-[#5f6b7e]">
                  Aún no registramos qué servicios lo consultan.
                </span>
              </div>
            </div>
          </div>
        )}
      </aside>
    </div>
  )
}
