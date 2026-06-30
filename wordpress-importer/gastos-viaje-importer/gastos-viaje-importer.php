<?php
/**
 * Plugin Name: Importador de Gastos de Viaje
 * Description: Importa el Blog de Gastos de Viaje como un post de WordPress por día.
 * Version: 1.2.0
 * Author: Lucio J Martínez
 */

if (!defined('ABSPATH')) {
    exit;
}

final class Gastos_Viaje_Importer {
    private $messages = array();
    private $errors = array();

    public function __construct() {
        add_action('admin_menu', array($this, 'add_page'));
    }

    public function add_page() {
        add_management_page(
            'Importar Gastos de Viaje',
            'Importar Gastos de Viaje',
            'manage_options',
            'gastos-viaje-importer',
            array($this, 'render_page')
        );
    }

    public function render_page() {
        if (!current_user_can('manage_options')) {
            return;
        }
        if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['gvi_import'])) {
            check_admin_referer('gvi_import_blog');
            $this->process_upload();
        }
        ?>
        <div class="wrap">
            <h1>Importar Blog de Gastos de Viaje</h1>
            <p>Cada día se convierte en una entrada de WordPress. Las entradas nuevas se crean como borradores y Divi aplicará la plantilla de posts configurada.</p>
            <?php foreach ($this->messages as $message) : ?>
                <div class="notice notice-success"><p><?php echo esc_html($message); ?></p></div>
            <?php endforeach; ?>
            <?php foreach ($this->errors as $error) : ?>
                <div class="notice notice-error"><p><?php echo esc_html($error); ?></p></div>
            <?php endforeach; ?>
            <form method="post" enctype="multipart/form-data">
                <?php wp_nonce_field('gvi_import_blog'); ?>
                <table class="form-table"><tbody><tr>
                    <th scope="row"><label for="gvi-file">Archivo exportado</label></th>
                    <td>
                        <input type="file" id="gvi-file" name="gvi_file" accept="application/json,.json" required>
                        <p class="description">Tamaño máximo permitido por WordPress: <?php echo esc_html(size_format(wp_max_upload_size())); ?>.</p>
                    </td>
                </tr></tbody></table>
                <?php submit_button('Importar como borradores', 'primary', 'gvi_import'); ?>
            </form>
        </div>
        <?php
    }

    private function process_upload() {
        if (empty($_FILES['gvi_file']['tmp_name']) || !is_uploaded_file($_FILES['gvi_file']['tmp_name'])) {
            $this->errors[] = 'No se recibió el archivo de exportación.';
            return;
        }
        $raw = file_get_contents($_FILES['gvi_file']['tmp_name']);
        $payload = json_decode($raw, true);
        if (!is_array($payload) || ($payload['format'] ?? '') !== 'gastos-viaje-wordpress-v1' || empty($payload['days'])) {
            $this->errors[] = 'El archivo no es una exportación válida de Gastos de Viaje.';
            return;
        }
        $trip = is_array($payload['trip'] ?? null) ? $payload['trip'] : array();
        $created = 0;
        $updated = 0;
        foreach ($payload['days'] as $day) {
            if (!is_array($day) || empty($day['sourceKey']) || empty($day['date'])) {
                continue;
            }
            $result = $this->import_day($trip, $day);
            if (is_wp_error($result)) {
                $this->errors[] = $result->get_error_message();
            } elseif ($result === 'updated') {
                $updated++;
            } else {
                $created++;
            }
        }
        if ($created || $updated) {
            $this->messages[] = sprintf('Importación terminada: %d post(s) creados y %d actualizados.', $created, $updated);
        }
    }

    private function import_day($trip, $day) {
        $entries = is_array($day['entries'] ?? null) ? $day['entries'] : array();
        $content = '';
        $featured_id = 0;
        $attachment_ids = array();
        foreach ($entries as $entry) {
            if (!is_array($entry)) {
                continue;
            }
            $type = sanitize_key($entry['tipo'] ?? 'texto');
            $description = sanitize_text_field($entry['descripcion'] ?? '');
            $time = sanitize_text_field($entry['hora'] ?? '');
            $place = implode(' · ', array_filter(array(
                sanitize_text_field($entry['pais'] ?? ''),
                sanitize_text_field($entry['ciudad'] ?? '')
            )));
            $meta = implode(' · ', array_filter(array($time, $place)));
            $entry_images = array();
            if (!empty($entry['images']) && is_array($entry['images'])) {
                $entry_images = $entry['images'];
            } elseif (!empty($entry['imageData'])) {
                $entry_images = array($entry);
            }
            $rendered_images = array();
            foreach ($entry_images as $image_index => $image) {
                if (!is_array($image) || empty($image['imageData'])) {
                    continue;
                }
                $image['descripcion'] = $description;
                if (empty($image['sourceKey'])) {
                    $image['sourceKey'] = sanitize_text_field(($entry['sourceKey'] ?? 'entry') . '-image-' . ($image_index + 1));
                }
                $attachment_id = $this->import_image($image);
                if (is_wp_error($attachment_id)) {
                    $this->errors[] = $attachment_id->get_error_message();
                    continue;
                }
                $attachment_ids[] = $attachment_id;
                if (!empty($entry['featuredImage']) && $image_index === 0) {
                    $featured_id = $attachment_id;
                    continue;
                }
                $url = wp_get_attachment_url($attachment_id);
                if ($url) {
                    $rendered_images[] = array('url' => $url, 'description' => $description);
                }
            }
            if ($type === 'gasto') {
                $amount = number_format_i18n((float) ($entry['gastoImporte'] ?? 0), 2);
                $currency = sanitize_text_field($entry['gastoMoneda'] ?? 'EUR');
                $content .= '<div class="gastos-viaje-entry gastos-viaje-expense">';
                if ($meta !== '') $content .= '<p><small>' . esc_html($meta) . '</small></p>';
                $content .= '<p><strong>' . esc_html($description ?: 'Gasto') . '</strong> — ' . esc_html($amount . ' ' . $currency) . '</p></div>';
            } elseif ($type === 'punto') {
                $latitude = isset($entry['latitude']) ? (float) $entry['latitude'] : null;
                $longitude = isset($entry['longitude']) ? (float) $entry['longitude'] : null;
                $map_url = esc_url_raw($entry['mapUrl'] ?? '');
                if ($map_url === '' && $latitude !== null && $longitude !== null) {
                    $map_url = 'https://www.openstreetmap.org/?mlat=' . rawurlencode((string) $latitude) . '&mlon=' . rawurlencode((string) $longitude) . '#map=18/' . rawurlencode((string) $latitude) . '/' . rawurlencode((string) $longitude);
                }
                $content .= '<section class="gastos-viaje-entry gastos-viaje-point">';
                if ($meta !== '') $content .= '<p><small>' . esc_html($meta) . '</small></p>';
                if ($description !== '') $content .= '<h2>' . esc_html($description) . '</h2>';
                if ($latitude !== null && $longitude !== null) {
                    $content .= '<p><strong>📍 ' . esc_html(number_format($latitude, 6, '.', '') . ', ' . number_format($longitude, 6, '.', '')) . '</strong>';
                    if ($map_url !== '') $content .= ' · <a href="' . esc_url($map_url) . '">Abrir en OpenStreetMap</a>';
                    $content .= '</p>';
                }
                $content .= '</section>';
            } elseif ($type === 'texto') {
                $text = (string) ($entry['texto'] ?? '');
                $content .= '<section class="gastos-viaje-entry gastos-viaje-text">';
                if ($meta !== '') $content .= '<p><small>' . esc_html($meta) . '</small></p>';
                if ($description !== '') $content .= '<h2>' . esc_html($description) . '</h2>';
                $content .= wpautop(esc_html($text)) . '</section>';
            }
            if (count($rendered_images) === 1) {
                $image = $rendered_images[0];
                $content .= '<figure class="wp-block-image"><img src="' . esc_url($image['url']) . '" alt="' . esc_attr($image['description']) . '">';
                if ($image['description'] !== '') {
                    $content .= '<figcaption>' . esc_html($image['description']) . '</figcaption>';
                }
                $content .= '</figure>';
            } elseif (count($rendered_images) > 1) {
                $content .= '<figure class="wp-block-gallery has-nested-images columns-2">';
                foreach ($rendered_images as $image) {
                    $content .= '<figure class="wp-block-image"><img src="' . esc_url($image['url']) . '" alt="' . esc_attr($image['description']) . '">';
                    if ($image['description'] !== '') {
                        $content .= '<figcaption>' . esc_html($image['description']) . '</figcaption>';
                    }
                    $content .= '</figure>';
                }
                $content .= '</figure>';
            }
        }

        $existing = get_posts(array(
            'post_type' => 'post',
            'post_status' => 'any',
            'numberposts' => 1,
            'meta_key' => '_gastos_viaje_day_key',
            'meta_value' => sanitize_text_field($day['sourceKey'])
        ));
        $post_date = preg_match('/^\d{4}-\d{2}-\d{2}$/', $day['date']) ? $day['date'] . ' 12:00:00' : current_time('mysql');
        $postarr = array(
            'post_title' => sanitize_text_field($day['title'] ?? $day['date']),
            'post_content' => wp_kses_post($content),
            'post_date' => $post_date,
            'post_date_gmt' => get_gmt_from_date($post_date),
            'post_type' => 'post'
        );
        $was_updated = !empty($existing);
        if ($was_updated) {
            $postarr['ID'] = $existing[0]->ID;
            $post_id = wp_update_post($postarr, true);
        } else {
            $postarr['post_status'] = 'draft';
            $post_id = wp_insert_post($postarr, true);
        }
        if (is_wp_error($post_id)) {
            return $post_id;
        }
        update_post_meta($post_id, '_gastos_viaje_day_key', sanitize_text_field($day['sourceKey']));
        update_post_meta($post_id, '_gastos_viaje_trip', sanitize_text_field($trip['nombre'] ?? 'Viaje'));
        if (!function_exists('wp_create_category')) {
            require_once ABSPATH . 'wp-admin/includes/taxonomy.php';
        }
        $category_id = wp_create_category('Viajes');
        if (!is_wp_error($category_id)) {
            wp_set_post_categories($post_id, array((int) $category_id), true);
        }
        $tags = array_merge(
            array(sanitize_text_field($trip['nombre'] ?? '')),
            array_map('sanitize_text_field', (array) ($day['countries'] ?? array())),
            array_map('sanitize_text_field', (array) ($day['cities'] ?? array()))
        );
        wp_set_post_tags($post_id, array_values(array_filter(array_unique($tags))), false);
        foreach ($attachment_ids as $attachment_id) {
            wp_update_post(array('ID' => $attachment_id, 'post_parent' => $post_id));
        }
        if ($featured_id) {
            set_post_thumbnail($post_id, $featured_id);
        } else {
            delete_post_thumbnail($post_id);
        }
        return $was_updated ? 'updated' : 'created';
    }

    private function import_image($entry) {
        $source_key = sanitize_text_field($entry['sourceKey'] ?? '');
        if ($source_key !== '') {
            $existing = get_posts(array(
                'post_type' => 'attachment',
                'post_status' => 'inherit',
                'numberposts' => 1,
                'meta_key' => '_gastos_viaje_image_key',
                'meta_value' => $source_key
            ));
            if (!empty($existing)) {
                return (int) $existing[0]->ID;
            }
        }
        if (!preg_match('#^data:([^;]+);base64,(.+)$#s', (string) ($entry['imageData'] ?? ''), $matches)) {
            return new WP_Error('gvi_image', 'Una imagen del archivo no tiene un formato válido.');
        }
        $bytes = base64_decode($matches[2], true);
        if ($bytes === false) {
            return new WP_Error('gvi_image', 'No se pudo reconstruir una imagen.');
        }
        $filename = sanitize_file_name($entry['imageName'] ?? 'imagen.jpg');
        if ($filename === '') $filename = 'imagen.jpg';
        $upload = wp_upload_bits($filename, null, $bytes);
        if (!empty($upload['error'])) {
            return new WP_Error('gvi_upload', $upload['error']);
        }
        $filetype = wp_check_filetype($upload['file'], null);
        $attachment_id = wp_insert_attachment(array(
            'post_mime_type' => $filetype['type'] ?: sanitize_mime_type($matches[1]),
            'post_title' => sanitize_text_field($entry['descripcion'] ?? pathinfo($filename, PATHINFO_FILENAME)),
            'post_status' => 'inherit'
        ), $upload['file'], 0, true);
        if (is_wp_error($attachment_id)) {
            return $attachment_id;
        }
        require_once ABSPATH . 'wp-admin/includes/image.php';
        $metadata = wp_generate_attachment_metadata($attachment_id, $upload['file']);
        wp_update_attachment_metadata($attachment_id, $metadata);
        if ($source_key !== '') {
            update_post_meta($attachment_id, '_gastos_viaje_image_key', $source_key);
        }
        return (int) $attachment_id;
    }
}

new Gastos_Viaje_Importer();
