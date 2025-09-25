import { cn } from "@/lib/utils"
import { 
  FaVideo as VideoIcon,
  FaSlack as SlackIcon,
  FaGoogleDrive as DriveIcon,
  FaGoogle as GoogleIcon,
  FaMicrosoft as TeamsIcon,
  FaVideo as DefaultIcon
} from 'react-icons/fa'
import { SiGooglemeet } from 'react-icons/si'

interface PlatformIconProps {
  platform: string
  className?: string
}

export function PlatformIcon({ platform, className = "h-4 w-4" }: PlatformIconProps) {
  // Normalize platform name to lowercase and replace spaces with underscores
  const normalizedPlatform = platform.toLowerCase().replace(/\s+/g, '_')
  
  // Map platform names to their corresponding icons
  const platformIcons: Record<string, React.ComponentType<{ className?: string }>> = {
    'google_meet': SiGooglemeet,
    'slack': SlackIcon,
    'drive': DriveIcon,
    'teams': TeamsIcon,
    'default': DefaultIcon
  }

  // Get the appropriate icon component or fallback to default
  const Icon = platformIcons[normalizedPlatform] || platformIcons['default']
  
  // Special styling for Google Meet icon
  const isGoogleMeet = normalizedPlatform === 'google_meet'
  const iconClasses = cn(
    "flex-shrink-0",
    isGoogleMeet ? "text-[#00897B]" : "text-gray-500",
    className
  )
  
  return (
    <span 
      className={cn("flex items-center justify-center")}
      title={normalizedPlatform.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
    >
      <Icon className={iconClasses} />
    </span>
  )
}
