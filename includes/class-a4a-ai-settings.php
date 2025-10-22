<?php
if ( ! defined( 'ABSPATH' ) ) { exit; }

class A4A_AI_Settings {
    const OPTION_KEY = 'a4a_ai_options';

    public function get_all() : array {
        $opts = get_option( self::OPTION_KEY, [] );
        return is_array( $opts ) ? $opts : [];
    }

    public function update_all( array $data ) : bool {
        return update_option( self::OPTION_KEY, $this->sanitize_all( $data ) );
    }

    private function sanitize_all( array $data ) : array {
        $out = [];
        foreach ( $data as $k => $v ) {
            $out[ sanitize_key( $k ) ] = is_string( $v ) ? wp_kses_post( $v ) : $v;
        }
        return $out;
    }
}

    public function get_api_key() : string {
        $all = $this->get_all();
        return isset($all['api_key']) ? (string) $all['api_key'] : '';
    }

    public function get_option( string $key, $default = '' ) {
        $all = $this->get_all();
        return array_key_exists($key, $all) ? $all[$key] : $default;
    }

