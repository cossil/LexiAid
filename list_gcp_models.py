import subprocess
import platform

def list_available_gcp_models(project_id: str, region: str):
    """
    Lists generative AI models available to a GCP project in a specific region
    that support content generation.
    """
    try:
        gcloud_executable = "gcloud"
        # Windows might require 'gcloud.cmd' if 'gcloud' alone isn't resolved correctly
        # This simple check might not cover all edge cases for gcloud path resolution on Windows.
        if platform.system() == "Windows":
            # No change needed if 'gcloud' is in PATH and resolvable.
            # If specific issues arise, one might try 'gcloud.cmd'.
            pass

        command = [
            gcloud_executable,
            "ai",
            "models",
            "list",
            f"--project={project_id}",
            f"--region={region}",
            "--filter=supportedGenerationMethods:generateContent", # Re-enabled to focus on generative models
            "--format=value(name, displayName, versionId, versionAliases)", # Added versionId and versionAliases
            "--sort-by=displayName"
        ]
        
        print(f"Executing command: {' '.join(command)}")
        process = subprocess.Popen(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, shell=platform.system() == "Windows")
        stdout, stderr = process.communicate()

        if process.returncode == 0:
            print("\nAvailable Generative Models (Name, DisplayName, VersionID, VersionAliases):")
            if stdout.strip():
                print(stdout)
            else:
                print("No models found matching the criteria.")
        else:
            print("\nError listing models:")
            print(f"Stderr: {stderr}")
            if stdout:
                print(f"Stdout: {stdout}")
            print(f"\nPlease ensure you are authenticated with gcloud (run 'gcloud auth login') "
                  f"and have the necessary permissions for project '{project_id}'.")
            print("You might also need to enable the Vertex AI API in your GCP project.")

    except FileNotFoundError:
        print(f"Error: '{gcloud_executable}' command not found. Please ensure Google Cloud SDK is installed and in your PATH.")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")

if __name__ == "__main__":
    gcp_project_id = "ai-tutor-dev-457802"  # Your GCP project ID
    gcp_region = "us-central1"         # Your GCP region
    
    print(f"Querying available generative models for project '{gcp_project_id}' in region '{gcp_region}'...")
    list_available_gcp_models(gcp_project_id, gcp_region)
