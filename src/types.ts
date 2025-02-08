export interface Campaign {
  id: string;
  name: string;
  timezone: string;
  start_time: string;
  end_time: string;
  campaign_start_date: string;
  campaign_end_date: string;
  total_contacts: number;
  contacts_called: number;
  status: "active" | "ended";
  created_at: string;
  assistantId: string;
  phoneNumberId: string;
}

export interface Contact {
  id: string;
  campaign_id: string;
  phone_number: string;
  name?: string;
  called: boolean;
  call_status?: string;
  called_at?: string;
  project_name?: string;
  unit_number?: string;
}

export interface Assistant {
  id: string;
  name: string;
}

export interface PhoneNumber {
  id: string;
  number: string;
  name: string;
  provider: string;
}
