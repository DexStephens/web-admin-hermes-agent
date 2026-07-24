resource "digitalocean_droplet" "app" {
  name       = "${var.project_name}-droplet"
  region     = var.region
  size       = var.droplet_size
  image      = var.droplet_image
  ssh_keys   = [data.digitalocean_ssh_key.terraform.id]
  monitoring = true
  user_data  = file("${path.module}/cloud-init.yaml")
  tags       = [var.project_name]
}

resource "digitalocean_firewall" "app" {
  name        = "${var.project_name}-fw"
  droplet_ids = [digitalocean_droplet.app.id]

  inbound_rule {
    protocol         = "tcp"
    port_range       = "22"
    source_addresses = ["0.0.0.0/0", "::/0"]
  }

  inbound_rule {
    protocol         = "tcp"
    port_range       = "80"
    source_addresses = ["0.0.0.0/0", "::/0"]
  }

  outbound_rule {
    protocol              = "tcp"
    port_range            = "1-65535"
    destination_addresses = ["0.0.0.0/0", "::/0"]
  }

  outbound_rule {
    protocol              = "udp"
    port_range            = "1-65535"
    destination_addresses = ["0.0.0.0/0", "::/0"]
  }
}
