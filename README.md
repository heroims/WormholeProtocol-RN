# WormholeProtocol-RN
Cross platform offline communication protocol based on Bluetooth Low Energe

## Installation
```bash
npm install react-native-ble-manager --save
npm install @heroims/react-native-ble-peripheral --save
npm install react-native-ble-wormhole --save
npx pod-install
```

## Usage
### Import
```javascript
import {BLEWormhole} from 'react-native-ble-wormhole';

```
### CreateNativeEventEmitter
```javascript
import BLEPeripheral from 'react-native-ble-peripheral';

var peripheralEmitter = new NativeEventEmitter(BLEPeripheral);
var centralEmitter = new NativeEventEmitter(NativeModules.BleManager);
BLEWormhole.CreateNativeEventEmitter(centralEmitter, peripheralEmitter);
```
### CreatServer
```javascript
BLEWormhole.CreatServer(bleServiceUUID, connectCharaUUIDs, name);
```
### Event handler
```javascript
BLEWormhole.DisconnectHandler = deviceID => {
    console.log('disconnect', deviceID);
};
BLEWormhole.ReceiveHandler = characteristic => {
    //characteristic = {'uuid':'','value':Buffer.from(''),'service':'','device':''}

};
BLEWormhole.DiscoverDeviceStopHandler = () => {
    console.log('stop scan');
};
BLEWormhole.DiscoverDeviceHandler = device => {
    //device =  {name:'',serviceUUIDs:['',''],deviceID:'',connected:false}
};
BLEWormhole.BluetoothStateHandler = res => {
    //res = 'on'  'off'
};

```
### GenerateDeviceID
```javascript
BLEWormhole.GenerateDeviceID()
  .then(res => {})
  .catch(err => {
    console.error(err);
  });
```
### CheckState
```javascript
BLEWormhole.CheckState();
```
### Scan
```javascript
BLEWormhole.Scan([bleServiceUUID], dicoveredSeconds, true);
```
### StopScan
```javascript
BLEWormhole.StopScan()
```
### Start
```javascript
BLEWormhole.StartPeripheral()
  .then(res => {})
  .catch(err => {
    console.error(err);
  });
BLEWormhole.StartCentral()
  .then(res => {})
  .catch(err => {
    console.error(err);
});
```
#### StartAll
```javascript
Start(receiveHandler)
  .then(res => {
     //Peripheral res.res1 
     //Central res.res2
  })
  .catch(err => {
    console.error(err);
  });
```
### Connect
```javascript
BLEWormhole.Connect(device.deviceID, bleServiceUUID, connectCharaUUIDs)
  .then(res => {
    console.log('connect:' + res.characteristic, deviceProperty);
  })
  .catch(err => {
    console.error(err);
});
```
### Disconnect
```javascript
BLEWormhole.Disconnect(device.deviceID)
  .then(res => {})
  .catch(err => {
    console.error(err);
  });
```
### StopNotification
```javascript
BLEWormhole.StopNotification(deviceID,serviceUUID,characteristicUUID)
  .then(res => {})
  .catch(err => {
    console.error(err);
  });
```
### Send
```javascript
BLEWormhole.SendBuffer(
            connectedDeviceName,
            connectedDeviceID,
            bleServiceUUID,
            incomingCharaUUID,
            data,
          );
```
