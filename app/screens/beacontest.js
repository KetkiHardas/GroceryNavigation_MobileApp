
import React, { PureComponent, Component, useCallback, useState } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TouchableHighlight,
    NativeEventEmitter,
    NativeModules,
    Platform,
    PermissionsAndroid,
    ScrollView,
    AppState,
    FlatList,
    Dimensions,
    Button,
    SafeAreaView
  } from 'react-native';
import BleManager from 'react-native-ble-manager';

const window = Dimensions.get('window');

const BleManagerModule = NativeModules.BleManager;
const bleManagerEmitter = new NativeEventEmitter(BleManagerModule);

/* export const BeaconTest = () => {
     return (

         <View style={styles.container}>
             <Text style={{...styles.header, minHeight:20}}> Beacon Test </Text>
         </View>
     );
 }*/


export class BeaconTest extends Component {
    constructor(){
        super()

        this.state = {
        scanning:false,
        peripherals: new Map(),
        appState: ''
        }

        this.handleDiscoverPeripheral = this.handleDiscoverPeripheral.bind(this);
        this.handleStopScan = this.handleStopScan.bind(this);
        this.handleUpdateValueForCharacteristic = this.handleUpdateValueForCharacteristic.bind(this);
        this.handleDisconnectedPeripheral = this.handleDisconnectedPeripheral.bind(this);
        this.handleAppStateChange = this.handleAppStateChange.bind(this);
    }

    componentDidMount() {
        AppState.addEventListener('change', this.handleAppStateChange);

        BleManager.start({showAlert: false});

        this.handlerDiscover = bleManagerEmitter.addListener('BleManagerDiscoverPeripheral', this.handleDiscoverPeripheral );
        this.handlerStop = bleManagerEmitter.addListener('BleManagerStopScan', this.handleStopScan );
        this.handlerDisconnect = bleManagerEmitter.addListener('BleManagerDisconnectPeripheral', this.handleDisconnectedPeripheral );
        this.handlerUpdate = bleManagerEmitter.addListener('BleManagerDidUpdateValueForCharacteristic', this.handleUpdateValueForCharacteristic );



        if (Platform.OS === 'android' && Platform.Version >= 23) {
            PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION).then((result) => {
                if (result) {
                    console.log("Permission is OK");
                } else {
                    PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION).then((result) => {
                    if (result) {
                        console.log("User accept");
                    } else {
                        console.log("User refuse");
                    }
                    });
                }
            });
        }

    }

    handleAppStateChange(nextAppState) {
        if (this.state.appState.match(/inactive|background/) && nextAppState === 'active') {
        console.log('App has come to the foreground!')
        BleManager.getConnectedPeripherals([]).then((peripheralsArray) => {
            console.log('Connected peripherals: ' + peripheralsArray.length);
        });
        }
        this.setState({appState: nextAppState});
    }

    componentWillUnmount() {
        this.handlerDiscover.remove();
        this.handlerStop.remove();
        this.handlerDisconnect.remove();
        this.handlerUpdate.remove();
    }

    handleDisconnectedPeripheral(data) {
        let peripherals = this.state.peripherals;
        let peripheral = peripherals.get(data.peripheral);
        if (peripheral) {
        peripheral.connected = false;
        peripherals.set(peripheral.id, peripheral);
        this.setState({peripherals});
        }
        console.log('Disconnected from ' + data.peripheral);
    }

    handleUpdateValueForCharacteristic(data) {
        console.log('Received data from ' + data.peripheral + ' characteristic ' + data.characteristic, data.value);
    }

    handleStopScan() {
        console.log('Scan is stopped');
        this.setState({ scanning: false });
    }

    startScan() {
        if (!this.state.scanning) {
        //this.setState({peripherals: new Map()});
        BleManager.scan([], 3, true).then((results) => {
            console.log('Scanning...');
            this.setState({scanning:true});
        });
        }
    }

    retrieveConnected(){
        BleManager.getConnectedPeripherals([]).then((results) => {
        if (results.length == 0) {
            console.log('No connected peripherals')
        }
        console.log(results);
        var peripherals = this.state.peripherals;
        for (var i = 0; i < results.length; i++) {
            var peripheral = results[i];
            peripheral.connected = true;
            peripherals.set(peripheral.id, peripheral);
            this.setState({ peripherals });
        }
        });
    }

    handleDiscoverPeripheral(peripheral){
        var peripherals = this.state.peripherals;
        console.log('Got ble peripheral', peripheral);
        if (!peripheral.name) {
        peripheral.name = 'NO NAME';
        }
        peripherals.set(peripheral.id, peripheral);
        this.setState({ peripherals });
    }

    // Calculates distance from RSSI and txPowerLevel. This function does not determine direction though.
    calculateDistance(rssi, txPowerLevel) {
        if (rssi == 0) {
            return -1.0;
        } else {
            let ratio = rssi*1.0/txPowerLevel;
            console.log('ratio is: ', ratio)
            if (ratio < 1.0) {
                console.log('if ans is: ', Math.pow(ratio,10))
                return Math.pow(ratio,10);
            } else {
                let accuracy =  (0.89976)*Math.pow(ratio,7.7095) + 0.111;    
                console.log('else ans is: ', accuracy)
                return accuracy;
            }
        }
    }

    test(peripheral) {
        
        if (peripheral){
            
        if (peripheral.connected){
            
            BleManager.disconnect(peripheral.id);
        }else{
            
            BleManager.connect(peripheral.id).then(() => {
            let peripherals = this.state.peripherals;
            let p = peripherals.get(peripheral.id);
            if (p) {
                p.connected = true;
                peripherals.set(peripheral.id, p);
                this.setState({peripherals});
            }


            
            console.log('Peripheral complete information: ' + peripheral);
            console.log('Connected to ' + peripheral.id);
            console.log('The RSSI value of the peripheral is:  ' + peripheral.rssi);

            // Get Beacon's distance
            // calculateDistance(peripheral.rssi, peripheral.txPowerLevel) // This is returning NaN
            


            setTimeout(() => {

                /* Test read current RSSI value*/
                
                BleManager.retrieveServices(peripheral.id).then((peripheralData) => {
                console.log('Retrieved peripheral services', peripheralData);
                BleManager.readRSSI(peripheral.id).then((rssi) => {
                    console.log('Retrieved actual RSSI value', rssi);
                });
                });
            }, 900);
            }).catch((error) => {
            console.log('Connection error', error);
            });
        }
        }
    }

    renderItem(item) {
        
        const color = item.connected ? 'green' : '#fff';
        return (
        <TouchableHighlight onPress={() => this.test(item) }>
            <View style={[styles.row, {backgroundColor: color}]}>
            <Text style={{fontSize: 12, textAlign: 'center', color: '#333333', padding: 10}}>{item.name}</Text>
            <Text style={{fontSize: 10, textAlign: 'center', color: '#333333', padding: 2}}>RSSI: {item.rssi}</Text>
            <Text style={{fontSize: 8, textAlign: 'center', color: '#333333', padding: 2, paddingBottom: 20}}>{item.id}</Text>
            </View>
        </TouchableHighlight>
        );
    }


    render() {
        const list = Array.from(this.state.peripherals.values());
        const btnScanTitle = 'Scan Bluetooth (' + (this.state.scanning ? 'on' : 'off') + ')';

        return (
        <SafeAreaView style={styles.container}>
            <View style={styles.container}>
            <Text style={{...styles.header, minHeight:20}}> Beacon Test </Text>

            <View style={{margin: 10}}>
                <Button title={btnScanTitle} onPress={() => this.startScan() } />
            </View>

            <View style={{margin: 10}}>
                <Button title="Retrieve connected peripherals" onPress={() => this.retrieveConnected() } />
            </View>

            <ScrollView style={styles.scroll}>
                {(list.length == 0) &&
                <View style={{flex:1, margin: 20}}>
                    <Text style={{textAlign: 'center'}}>No peripherals</Text>
                </View>
                }
                <FlatList
                data={list}
                renderItem={({ item }) => this.renderItem(item) }
                keyExtractor={item => item.id}
                />

            </ScrollView>
            </View>
        </SafeAreaView>
        );
    }
    }

const styles = StyleSheet.create({
    container: {
      flex: 2,
      flexDirection: 'column',
      backgroundColor: '#FFF',
      width: window.width,
      height: window.height
    },
    header: {
      color: "black",
      fontSize: 20,
      fontWeight: "bold",
      textAlign: "center",
      marginVertical: 10,
    },
    text: {
      textAlign: 'center',
      fontSize: 20,
    },
    scroll: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    margin: 10,
    },
    row: {
    margin: 10
    },
});