import { ApplicationConfiguration } from "./ApplicationConfiguration"
import { Device } from "./Device"

export type ResponseCallbackType = string | undefined | null

export type ResponseCallback = (responseText?: ResponseCallbackType) => void


export type DiscoveredDevicesCallbackType = Record<string, Device[]> | Device[]

/**
 * The callback for receiving discovered devices 
 * 
 * NOTE: When a deviceType is specified will be just a list of devices, if any matching that type.
 */
export type DiscoveredDevicesCallback = (discoveredDevices: DiscoveredDevicesCallbackType) => void

/**
 * Callback for getting the application configuration 
 */
export type ApplicationConfigurationCallback = (applicationConfiguration: ApplicationConfiguration | null) => void