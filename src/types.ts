export interface Campaign {
  id: string;
  name: string;
  timezone: string;
  start_time: string;
  end_time: string;
  campaign_start_date: string; // Add this
  campaign_end_date: string; // Add this
  total_contacts: number;
  contacts_called: number;
  status: "active" | "ended";
  created_at: string;
  assistantId: string;
}

export interface Contact {
  id: string;
  campaign_id: string;
  phone_number: string;
  name?: string;
  called: boolean;
  call_status?: string;
  called_at?: string;
  project_name?: string; // Add this
  unit_number?: string; // Add this
}

export interface Assistant {
  id: string;
  name: string;
}
