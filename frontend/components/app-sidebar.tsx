import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";
import CopyButton from "@/components/copy-button";
import Link from "next/link";
export type Contexts = {
  id: number;
  filename: string;
  content: string;
}[];

export async function AppSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const contexts = (await fetch(`${process.env.API_URL}/api/logs`).then((res) =>
    res.json()
  )) as Contexts;

  return (
    <Sidebar {...props}>
      <SidebarContent>
        <SidebarGroup>
          <Button className="w-full flex items-center justify-center gap-2 mb-2">
            <PlusIcon className="h-4 w-4" />
            <span>New Context</span>
          </Button>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Contexts</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {contexts.map((context) => (
                <SidebarMenuItem
                  key={context.filename}
                  className="flex items-center justify-between pr-2"
                >
                  <SidebarMenuButton asChild className="flex-1 mr-2">
                    <Link href={`/context/${context.id}`}>
                      {context.filename}
                    </Link>
                  </SidebarMenuButton>
                  <CopyButton id={context.id.toString()} />
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
