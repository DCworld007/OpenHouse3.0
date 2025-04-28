declare module 'leaflet-routing-machine' {
  import * as L from 'leaflet';

  namespace Routing {
    function control(options: any): any;
    function plan(waypoints: any, options: any): any;
    function mapbox(token: string, options: any): any;
  }

  export = Routing;
}

declare module 'lrm-mapbox' {
  export = any;
} 