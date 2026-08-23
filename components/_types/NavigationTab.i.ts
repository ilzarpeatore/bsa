import { BottomTabNavigationOptions } from "@react-navigation/bottom-tabs";
import type { ComponentProps } from "react";
import { Ionicons } from "@expo/vector-icons";

export type IoniconName = ComponentProps<typeof Ionicons>['name'];

export interface NavigationTabOptionsInterface extends BottomTabNavigationOptions {
    icon: IoniconName,
    label: string,
    tabBarVisible: boolean,
}
