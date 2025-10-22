<?php
// header-clean
if ( ! defined( 'ABSPATH' ) ) { exit; }

class A4A_AI_Crawler {
    public function run_example( string $url ) : array {
        return [ 'url' => esc_url_raw( $url ), 'status' => 'stubbed' ];
    }
}

