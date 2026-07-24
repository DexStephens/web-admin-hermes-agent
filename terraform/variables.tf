variable "do_token" {
  description = "DigitalOcean API token"
  type        = string
  sensitive   = true
}

variable "region" {
  description = "DigitalOcean region slug"
  type        = string
  default     = "nyc3"
}

variable "droplet_size" {
  description = "DigitalOcean droplet size slug"
  type        = string
  default     = "s-2vcpu-4gb"
}

variable "droplet_image" {
  description = "Base image for the droplet; cloud-init installs Docker on top"
  type        = string
  default     = "ubuntu-22-04-x64"
}

variable "ssh_key_name" {
  description = "Name of the SSH key already registered in the DigitalOcean account"
  type        = string
  default     = "dexter-macbook-key"
}

variable "project_name" {
  description = "Name prefix used for droplet and firewall resources"
  type        = string
  default     = "hermes-agent"
}
