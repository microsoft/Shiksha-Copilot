export interface MenuItem {
    darkIcon?: string;
    lightIcon?: string;
    match?: string;
    text: string;
    subItems?: string[];
    route?:string;
    permission:string[];
  }