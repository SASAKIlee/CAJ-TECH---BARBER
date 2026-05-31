import { NavLink as RouterNavLink, NavLinkProps } from "react-router-dom";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface NavLinkCompatProps extends Omit<NavLinkProps, "className" | "style"> {
  className?: string;
  activeClassName?: string;
  pendingClassName?: string;
  style?: React.CSSProperties;
  activeStyle?: React.CSSProperties;
}

const NavLink = forwardRef<HTMLAnchorElement, NavLinkCompatProps>(
  ({ className, activeClassName, pendingClassName, style, activeStyle, ...props }, ref) => {
    return (
      <RouterNavLink
        ref={ref}
        className={({ isActive, isPending }) =>
          cn(className, isActive && activeClassName, isPending && pendingClassName) || undefined
        }
        style={({ isActive }) =>
          isActive && activeStyle ? { ...style, ...activeStyle } : style
        }
        {...props}
      />
    );
  }
);

NavLink.displayName = "NavLink";

export { NavLink };