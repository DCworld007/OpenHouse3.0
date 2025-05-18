declare module 'leaflet-routing-machine' {
  import * as L from 'leaflet';

  namespace Routing {
    function control(options: any): any;
    function plan(waypoints: any, options: any): any;
    function osrmv1(options: any): any;
  }

  export = Routing;
} 