"use client"

import { useState, useMemo } from "react"
import { Building2, Search, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

interface Org {
  id: string
  name: string
  slug: string
  membership_id: string
}

interface OrgSwitcherProps {
  orgs: Org[]
  selectedOrgId?: string
}

/**
 * Organization Switcher with Search
 * 
 * Replaces dropdown with searchable combobox.
 * Filters organizations by first letters of name.
 */
export function OrgSwitcher({ orgs, selectedOrgId }: OrgSwitcherProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  
  // Extract slug from URL path (e.g., /dashboard/demo-org -> demo-org)
  // This supports slug-based routing: /dashboard/[slug]
  const pathSlug = pathname.match(/\/dashboard\/([^\/]+)/)?.[1]
  const urlOrgId = searchParams.get('orgId')
  
  // Determine selected org: slug from path > orgId from query > prop > first org
  let selectedOrg = orgs[0]
  if (pathSlug) {
    // Find org by slug from URL path
    selectedOrg = orgs.find((org) => org.slug === pathSlug) || orgs[0]
  } else if (urlOrgId) {
    // Fallback to orgId from query params (backward compatibility)
    selectedOrg = orgs.find((org) => org.id === urlOrgId) || orgs[0]
  } else if (selectedOrgId) {
    // Use prop if provided
    selectedOrg = orgs.find((org) => org.id === selectedOrgId) || orgs[0]
  }

  // Filter organizations by search query (first letters)
  const filteredOrgs = useMemo(() => {
    if (!searchQuery.trim()) {
      return orgs
    }

    const query = searchQuery.toLowerCase().trim()
    return orgs.filter((org) => {
      // Filter by first letters of name
      const name = org.name.toLowerCase()
      // Check if name starts with query
      if (name.startsWith(query)) {
        return true
      }
      // Also check if any word in name starts with query
      const words = name.split(/\s+/)
      return words.some((word) => word.startsWith(query))
    })
  }, [orgs, searchQuery])

  const handleOrgChange = (orgId: string) => {
    // Find org by ID to get slug
    const org = orgs.find((o) => o.id === orgId)
    if (!org) return

    // Use slug-based routing: /dashboard/[slug]
    const targetPath = `/dashboard/${org.slug}`
    
    router.push(targetPath)
    // Reload to update all components with new org context
    router.refresh()
    setOpen(false)
    setSearchQuery("")
  }

  if (!selectedOrg || orgs.length === 0) {
    return null
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between px-3 py-2 h-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <div className="flex items-center gap-2 truncate">
            <Building2 className="h-4 w-4 flex-shrink-0" />
            <span className="truncate text-sm font-medium">{selectedOrg.name}</span>
          </div>
          <Search className="h-4 w-4 flex-shrink-0 ml-2 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        <Command>
          <CommandInput
            placeholder="Ieškoti bendruomenės..."
            value={searchQuery}
            onValueChange={setSearchQuery}
            className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
          <CommandList>
            <CommandEmpty>Bendruomenė nerasta</CommandEmpty>
            <CommandGroup>
              {filteredOrgs.map((org) => (
                <CommandItem
                  key={org.id}
                  value={org.name}
                  onSelect={() => handleOrgChange(org.id)}
                  className="cursor-pointer focus:bg-accent focus:text-accent-foreground"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedOrg.id === org.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col">
                    <span className="font-medium">{org.name}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
