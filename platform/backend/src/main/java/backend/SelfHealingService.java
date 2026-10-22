
package backend;

import java.time.LocalDateTime;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

@Service
public class SelfHealingService {

    private final RestTemplate restTemplate = new RestTemplate();
    private final RecoveryEventRepository eventRepository;

    private final String containerName = "self-healing-test";
    private final String healthUrl = "http://localhost:8081/health";

    public SelfHealingService(RecoveryEventRepository eventRepository) {
        this.eventRepository = eventRepository;
    }

    private void saveEvent(String eventType, String message) {
        RecoveryEvent event = new RecoveryEvent(
            containerName,
            eventType,
            message,
            LocalDateTime.now()
        );

        eventRepository.save(event);
    }

    private boolean isApplicationHealthy() {
        try {
            String response = restTemplate.getForObject(
                healthUrl,
                String.class
            );

            return "Application is healthy".equals(response);
        } catch (Exception e) {
            return false;
        }
    }

    @Scheduled(fixedDelay = 10000)
    public void monitorApplication() {

        if (isApplicationHealthy()) {
            System.out.println("MONITOR: Test application is healthy.");
            return;
        }

        System.out.println(
            "ALERT: Application failed. Starting recovery..."
        );

        saveEvent("FAILURE", "Test application was unavailable.");

        try {
            Process process = new ProcessBuilder(
                "docker", "restart", containerName
            )
                .redirectErrorStream(true)
                .start();

            String output = new String(
                process.getInputStream().readAllBytes()
            );

            int exitCode = process.waitFor();

            if (exitCode != 0) {
                System.out.println("RECOVERY FAILED: " + output);

                saveEvent(
                    "RECOVERY_FAILED",
                    "Docker restart failed: " + output
                );
                return;
            }

            System.out.println(
                "RECOVERY: Container restarted. Verifying health..."
            );

            // Wait briefly for the application to start.
            boolean recovered = false;

            for (int attempt = 1; attempt <= 5; attempt++) {
                Thread.sleep(2000);

                if (isApplicationHealthy()) {
                    recovered = true;
                    break;
                }
            }

            if (recovered) {
                System.out.println(
                    "RECOVERY SUCCESS: Application is healthy again."
                );

                saveEvent(
                    "RECOVERY",
                    "Application restarted and health verified."
                );
            } else {
                System.out.println(
                    "RECOVERY FAILED: Application did not become healthy."
                );

                saveEvent(
                    "RECOVERY_FAILED",
                    "Container restarted but application remained unhealthy."
                );
            }

        } catch (Exception e) {
            System.out.println(
                "RECOVERY ERROR: " + e.getMessage()
            );

            saveEvent(
                "RECOVERY_FAILED",
                "Recovery error: " + e.getMessage()
            );
        }
    }
}
