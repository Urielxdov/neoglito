import { MorphIcon } from 'morphicons/react'
import type { IconInput, MorphIconProps } from 'morphicons/react'

interface AppIconProps extends Omit<MorphIconProps, 'icon'> {
  icon: IconInput
}

export function AppIcon({
  icon,
  size = 18,
  strokeWidth = 2,
  absoluteStrokeWidth = true,
  reducedMotion = 'user',
  ...props
}: AppIconProps) {
  return (
    <MorphIcon
      icon={icon}
      size={size}
      strokeWidth={strokeWidth}
      absoluteStrokeWidth={absoluteStrokeWidth}
      reducedMotion={reducedMotion}
      {...props}
    />
  )
}
