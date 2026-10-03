import type { ComponentProps } from 'react';
import { ProjectDetailView } from '@neoglito/web/components/repositories/project-detail-view';

type ProjectDetailPanelProps = ComponentProps<typeof ProjectDetailView>;

export function ProjectDetailPanel(props: ProjectDetailPanelProps) {
  return (
    <section className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-2xl bg-white shadow-[0_24px_60px_-20px_rgba(15,30,55,0.45),0_8px_22px_-12px_rgba(15,30,55,0.25)] dark:bg-[#111826] dark:shadow-[0_24px_60px_-20px_rgba(0,0,0,0.7)]">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <ProjectDetailView {...props} />
      </div>
    </section>
  );
}
