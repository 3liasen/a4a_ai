<?php
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class A4A_AI_Tools {
    const MENU_SLUG   = 'a4a-ai-tools';
    const OPTION_AUTO = 'a4a_ai_auto_strip_bom';

    private static $instance = null;

    private $messages      = [];
    private $errors        = [];
    private $scan_results  = null;
    private $auto_executed = false;

    public static function instance() : self {
        if ( null === self::$instance ) {
            self::$instance = new self();
        }

        return self::$instance;
    }

    public function init() : void {
        add_action( 'admin_menu', [ $this, 'register_menu' ] );
        add_action( 'admin_init', [ $this, 'handle_requests' ] );
        add_action( 'admin_notices', [ $this, 'render_notices' ] );
    }

    public function register_menu() : void {
        add_submenu_page(
            A4A_AI_Plugin::SLUG,
            __( 'A4A AI Tools', 'a4a-ai' ),
            __( 'Tools', 'a4a-ai' ),
            'manage_options',
            self::MENU_SLUG,
            [ $this, 'render_page' ]
        );
    }

    public function handle_requests() : void {
        if ( ! is_admin() || ! current_user_can( 'manage_options' ) ) {
            return;
        }

        $this->maybe_auto_strip();

        if ( isset( $_POST['a4a_ai_tools_action'] ) ) {
            $action = sanitize_key( wp_unslash( $_POST['a4a_ai_tools_action'] ) );
            switch ( $action ) {
                case 'strip':
                    $this->handle_strip_action();
                    break;
                case 'toggle_auto':
                    $this->handle_toggle_action();
                    break;
            }
        }

        if ( isset( $_GET['a4a_ai_tools_scan'] ) ) {
            $this->handle_scan_action();
        }
    }

    public function render_notices() : void {
        if ( ! current_user_can( 'manage_options' ) ) {
            return;
        }

        foreach ( $this->messages as $message ) {
            printf(
                '<div class="notice notice-success"><p>%s</p></div>',
                wp_kses_post( $message )
            );
        }

        foreach ( $this->errors as $error ) {
            printf(
                '<div class="notice notice-error"><p>%s</p></div>',
                wp_kses_post( $error )
            );
        }
    }

    public function render_page() : void {
        if ( ! current_user_can( 'manage_options' ) ) {
            wp_die( esc_html__( 'You do not have permission to access this page.', 'a4a-ai' ) );
        }

        if ( null === $this->scan_results ) {
            $this->scan_results = $this->scan_for_issues();
        }

        $auto_enabled = (bool) get_option( self::OPTION_AUTO, false );
        $scan_url     = wp_nonce_url(
            admin_url( 'admin.php?page=' . self::MENU_SLUG . '&a4a_ai_tools_scan=1' ),
            'a4a_ai_tools_scan'
        );
        ?>
        <div class="wrap">
            <h1><?php esc_html_e( 'A4A AI Tools', 'a4a-ai' ); ?></h1>
            <p><?php esc_html_e( 'Scan for and remove UTF-8 BOM or stray whitespace that triggers “headers already sent” warnings.', 'a4a-ai' ); ?></p>

            <form method="post" style="margin-bottom:1.5rem;">
                <?php wp_nonce_field( 'a4a_ai_toggle_auto' ); ?>
                <input type="hidden" name="a4a_ai_tools_action" value="toggle_auto">
                <input type="hidden" name="a4a_ai_auto_current" value="<?php echo $auto_enabled ? '1' : '0'; ?>">
                <button type="submit" class="button">
                    <?php
                    echo esc_html(
                        $auto_enabled
                            ? __( 'Disable automatic BOM stripping', 'a4a-ai' )
                            : __( 'Enable automatic BOM stripping', 'a4a-ai' )
                    );
                    ?>
                </button>
            </form>

            <p>
                <a class="button" href="<?php echo esc_url( $scan_url ); ?>">
                    <?php esc_html_e( 'Scan Now', 'a4a-ai' ); ?>
                </a>
            </p>

            <form method="post" style="margin-top:1rem;">
                <?php wp_nonce_field( 'a4a_ai_strip_bom' ); ?>
                <input type="hidden" name="a4a_ai_tools_action" value="strip">
                <button type="submit" class="button button-primary">
                    <?php esc_html_e( 'Strip BOM Now', 'a4a-ai' ); ?>
                </button>
            </form>

            <h2 class="title" style="margin-top:2rem;"><?php esc_html_e( 'Scan results', 'a4a-ai' ); ?></h2>
            <?php if ( empty( $this->scan_results ) ) : ?>
                <p><?php esc_html_e( 'All plugin PHP files look clean. No BOM or stray output detected.', 'a4a-ai' ); ?></p>
            <?php else : ?>
                <table class="widefat striped" style="max-width:960px;">
                    <thead>
                    <tr>
                        <th><?php esc_html_e( 'File', 'a4a-ai' ); ?></th>
                        <th><?php esc_html_e( 'Issue', 'a4a-ai' ); ?></th>
                        <th><?php esc_html_e( 'Leading bytes (hex)', 'a4a-ai' ); ?></th>
                    </tr>
                    </thead>
                    <tbody>
                    <?php foreach ( $this->scan_results as $result ) : ?>
                        <tr>
                            <td><code><?php echo esc_html( $result['relative'] ); ?></code></td>
                            <td><?php echo esc_html( $result['reason'] ); ?></td>
                            <td><code><?php echo esc_html( $result['bytes'] ); ?></code></td>
                        </tr>
                    <?php endforeach; ?>
                    </tbody>
                </table>
            <?php endif; ?>
        </div>
        <?php
    }

    private function maybe_auto_strip() : void {
        if ( $this->auto_executed ) {
            return;
        }
        $this->auto_executed = true;

        if ( ! get_option( self::OPTION_AUTO, false ) ) {
            return;
        }

        $issues = $this->scan_for_issues();
        if ( empty( $issues ) ) {
            return;
        }

        $count = $this->strip_files( wp_list_pluck( $issues, 'path' ) );
        if ( $count > 0 ) {
            $this->messages[] = sprintf(
                _n(
                    'A4A AI automatically removed BOM/whitespace from %d file.',
                    'A4A AI automatically removed BOM/whitespace from %d files.',
                    $count,
                    'a4a-ai'
                ),
                $count
            );
        }
    }

    private function handle_strip_action() : void {
        check_admin_referer( 'a4a_ai_strip_bom' );

        $issues = $this->scan_for_issues();
        if ( empty( $issues ) ) {
            $this->messages[] = __( 'No BOM was detected in plugin PHP files.', 'a4a-ai' );
            $this->scan_results = [];
            return;
        }

        $count = $this->strip_files( wp_list_pluck( $issues, 'path' ) );
        if ( $count > 0 ) {
            $this->messages[] = sprintf(
                _n( 'Removed BOM/whitespace from %d file.', 'Removed BOM/whitespace from %d files.', $count, 'a4a-ai' ),
                $count
            );
        } else {
            $this->errors[] = __( 'Unable to remove BOM. Check file permissions.', 'a4a-ai' );
        }

        $this->scan_results = $this->scan_for_issues();
    }

    private function handle_toggle_action() : void {
        check_admin_referer( 'a4a_ai_toggle_auto' );

        $current = ! empty( $_POST['a4a_ai_auto_current'] );
        $enable  = ! $current;

        update_option( self::OPTION_AUTO, $enable ? 1 : 0, true );

        $this->messages[] = $enable
            ? __( 'Automatic BOM stripping enabled. Files will be cleaned on admin load if needed.', 'a4a-ai' )
            : __( 'Automatic BOM stripping disabled.', 'a4a-ai' );
    }

    private function handle_scan_action() : void {
        if ( ! isset( $_GET['_wpnonce'] ) || ! wp_verify_nonce( sanitize_key( $_GET['_wpnonce'] ), 'a4a_ai_tools_scan' ) ) {
            $this->errors[] = __( 'Security check failed while scanning for BOM.', 'a4a-ai' );
            return;
        }

        $this->scan_results = $this->scan_for_issues();
        $count              = count( $this->scan_results );

        $this->messages[] = $count
            ? sprintf(
                _n( 'Found %d file with BOM/leading output.', 'Found %d files with BOM/leading output.', $count, 'a4a-ai' ),
                $count
            )
            : __( 'All plugin PHP files look clean. No BOM detected.', 'a4a-ai' );
    }

    private function scan_for_issues() : array {
        $issues = [];

        foreach ( $this->get_php_files() as $path ) {
            $analysis = $this->analyze_file( $path );
            if ( ! $analysis['has_issue'] ) {
                continue;
            }

            $issues[] = $analysis;
        }

        return $issues;
    }

    private function get_php_files() : array {
        $files = [];
        $root  = plugin_dir_path( A4A_AI_PLUGIN_FILE );

        $iterator = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator(
                $root,
                RecursiveDirectoryIterator::SKIP_DOTS
            )
        );

        foreach ( $iterator as $file ) {
            /** @var SplFileInfo $file */
            if ( $file->isDir() ) {
                continue;
            }

            if ( strtolower( $file->getExtension() ) !== 'php' ) {
                continue;
            }

            $files[] = $file->getPathname();
        }

        return $files;
    }

    private function analyze_file( string $path ) : array {
        $contents = file_get_contents( $path );

        if ( false === $contents ) {
            return [
                'path'      => $path,
                'relative'  => $this->relative_path( $path ),
                'has_issue' => false,
                'reason'    => '',
                'bytes'     => '',
            ];
        }

        $pos = strpos( $contents, '<?php' );
        if ( false === $pos ) {
            return [
                'path'      => $path,
                'relative'  => $this->relative_path( $path ),
                'has_issue' => false,
                'reason'    => '',
                'bytes'     => '',
            ];
        }

        $prefix = substr( $contents, 0, $pos );

        if ( '' === $prefix ) {
            return [
                'path'      => $path,
                'relative'  => $this->relative_path( $path ),
                'has_issue' => false,
                'reason'    => '',
                'bytes'     => '',
            ];
        }

        $bytes  = strtoupper( bin2hex( substr( $contents, 0, 3 ) ) );
        $reason = ( 0 === strpos( $contents, "\xEF\xBB\xBF" ) )
            ? __( 'UTF-8 BOM detected before &lt;?php', 'a4a-ai' )
            : __( 'Whitespace or characters before &lt;?php', 'a4a-ai' );

        return [
            'path'      => $path,
            'relative'  => $this->relative_path( $path ),
            'has_issue' => true,
            'reason'    => $reason,
            'bytes'     => $bytes,
        ];
    }

    private function strip_files( array $paths ) : int {
        $success = 0;

        foreach ( $paths as $path ) {
            if ( ! is_writable( $path ) ) {
                $this->errors[] = sprintf(
                    __( 'File %s is not writable. Please adjust permissions and try again.', 'a4a-ai' ),
                    esc_html( $this->relative_path( $path ) )
                );
                continue;
            }

            if ( $this->strip_file( $path ) ) {
                $success++;
            } else {
                $this->errors[] = sprintf(
                    __( 'Failed to rewrite %s. Please adjust permissions and try again.', 'a4a-ai' ),
                    esc_html( $this->relative_path( $path ) )
                );
            }
        }

        return $success;
    }

    private function strip_file( string $path ) : bool {
        $contents = file_get_contents( $path );
        if ( false === $contents ) {
            return false;
        }

        $pos = strpos( $contents, '<?php' );
        if ( false === $pos ) {
            return false;
        }

        $contents = substr( $contents, $pos );
        $contents = preg_replace( '/\?>\s*$/', '', $contents );
        $contents = str_replace( "\r\n", "\n", $contents );
        $contents = str_replace( "\r", "\n", $contents );

        if ( '' === $contents || false === strpos( $contents, '<?php' ) ) {
            return false;
        }

        if ( substr( $contents, -1 ) !== "\n" ) {
            $contents .= "\n";
        }

        return false !== file_put_contents( $path, $contents );
    }

    private function relative_path( string $path ) : string {
        $root = plugin_dir_path( A4A_AI_PLUGIN_FILE );
        return ltrim( str_replace( $root, '', wp_normalize_path( $path ) ), '/' );
    }
}

