import { Printer } from "./Printer";
import { Status } from "./Status";

const watchListMap: Record<string, WatchListItem> = {};

type WatchListItem = {
  /**
   * pretty sure this was a 'Device' on original, but how did it call 'getStatus()' then!
   */
  printer: Printer
  status: Status | '' // '' is initial state it is stringified for equality
  onchange: (oldStatus: Status | '', newStatus: Status) => void,
  errors: number,
  errorsForOffline: number
}

function updateWatchListItemStatus(watchListItem: WatchListItem, status: Status) {
  if (status instanceof Status && watchListMap[watchListItem.printer.device.uid]) {
    if (status.offline) {
      watchListItem.errors++;
      if (watchListItem.errors < watchListItem.errorsForOffline) {
        return;
      }
    } else {
      watchListItem.errors = 0;
    }

    const currentStatus = watchListMap[watchListItem.printer.device.uid].status;
    // they used JSON.stringify as easy deep equality
    const currentStatusStringified = JSON.stringify(currentStatus);
    watchListItem.status = status;
    const newStatusStringified = JSON.stringify(status);
    if (newStatusStringified !== currentStatusStringified) {
      watchListItem.onchange(currentStatus, status)
    }
  }
}

export class DeviceWatcher {
  private watchInterval: NodeJS.Timer | null = null;

  start = () => {
    // need to import this for side-effects to get it to run
    this.watchInterval = setInterval(() => {
      console.log('starting event watcher...')
      for (const uid in watchListMap) {
        if (watchListMap.hasOwnProperty(uid)) {
          const watchListItem = watchListMap[uid];
          // immediately invoked
          ((watchListItem: WatchListItem) => {
            (watchListItem.printer.getStatus as ((success?: (status: Status) => void, failure?: (err: any) => void) => void))(
              (status: Status) => { updateWatchListItemStatus(watchListItem, status) },
              () => { updateWatchListItemStatus(watchListItem, new Status("")) }
            )
          })(watchListItem)
        }
      }
    }, 2000);
  }

  watch = (printer: Printer, onchange: (oldStatus: Status | '', newStatus: Status) => void, errorsForOffline?: number) => {
    if (errorsForOffline === undefined) {
      errorsForOffline = 2
    }

    // somehow it was a device with uid, but could 'getStatus' - think this code never worked.
    watchListMap[printer.device.uid] = {
      printer: printer,
      status: '',
      onchange,
      errors: 0,
      errorsForOffline
    }
  }

  stopWatching = (printer: Printer) => {
    delete watchListMap[printer.device.uid]
  }

  stop = () => {
    if (this.watchInterval === null) {
      console.warn('nothing to stop');
    } else {
      clearInterval(this.watchInterval);
      this.watchInterval = null;
    }
  }
}